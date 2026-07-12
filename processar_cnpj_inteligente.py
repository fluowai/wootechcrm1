# -*- coding: utf-8 -*-
import os
import sqlite3
import pandas as pd
import requests
import zipfile
import io
import glob
import time
from xml.etree.ElementTree import fromstring

# ====================== CONFIGURAÇÃO ======================
share_token = os.environ.get("CNPJ_WEBDAV_TOKEN", "YggdBLfdninEJX9")
webdav_base = "https://arquivos.receitafederal.gov.br/public.php/webdav/"
db_name = "cnpj_filtrado.db"
pasta_temp = "temp_zip"

# Mapeamento de colunas (Layout Receita)
COLUNAS_EMPRESA = {0: 'cnpj_basico', 1: 'razao_social', 4: 'capital_social', 5: 'porte'}
COLUNAS_ESTABELECIMENTO = {0: 'cnpj_basico', 1: 'cnpj_ordem', 2: 'cnpj_dv', 4: 'nome_fantasia', 
                         5: 'situacao', 11: 'cnae', 19: 'uf', 20: 'municipio', 
                         21: 'ddd1', 22: 'tel1', 27: 'email'}
COLUNAS_SOCIOS = {0: 'cnpj_basico', 3: 'nome_socio'}

def iniciar_db():
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    # Criar tabelas temporárias para o merge
    cursor.execute("DROP TABLE IF EXISTS empresas")
    cursor.execute("CREATE TABLE empresas (cnpj_basico TEXT PRIMARY KEY, razao_social TEXT, capital_social TEXT, porte TEXT)")
    
    cursor.execute("DROP TABLE IF EXISTS estabelecimentos")
    cursor.execute("CREATE TABLE estabelecimentos (cnpj_basico TEXT, cnpj_full TEXT, nome_fantasia TEXT, cnae TEXT, uf TEXT, municipio TEXT, telefone TEXT, email TEXT)")
    
    cursor.execute("DROP TABLE IF EXISTS socios")
    cursor.execute("CREATE TABLE socios (cnpj_basico TEXT, nome_socio TEXT)")
    
    conn.commit()
    return conn

def propfind(url):
    headers = {"Depth": "1"}
    r = requests.request("PROPFIND", url, auth=(share_token, ""), headers=headers, timeout=30)
    r.raise_for_status()
    return r.content

def parse_items(xml_content, base_path=""):
    root = fromstring(xml_content)
    ns = {"d": "DAV:"}
    items = []
    for resp in root.findall(".//d:response", ns):
        href = resp.find("d:href", ns).text.strip("/")
        rel_path = href.replace("public.php/webdav", "").strip("/")
        if not rel_path or rel_path == base_path.strip("/"): continue
        name = rel_path.split("/")[-1]
        is_dir = resp.find(".//d:resourcetype/d:collection", ns) is not None
        items.append((name, is_dir))
    return items

def processar_arquivo(url, tipo, conn):
    filename = url.split("/")[-1]
    print(f"⬇️ Baixando e Processando: {filename}...")
    
    # Download em stream para não carregar tudo na RAM
    r = requests.get(url, auth=(share_token, ""), stream=True)
    with open("temp.zip", "wb") as f:
        for chunk in r.iter_content(chunk_size=1024*1024):
            f.write(chunk)
            
    with zipfile.ZipFile("temp.zip", 'r') as z:
        csv_name = z.namelist()[0]
        with z.open(csv_name) as f:
            # Lendo em pedaços de 100 mil linhas para economizar RAM
            chunk_iter = pd.read_csv(f, sep=';', encoding='latin1', header=None, 
                                     chunksize=100000, dtype=str, on_bad_lines='skip')
            
            for chunk in chunk_iter:
                if tipo == 'EMPRESA':
                    df = chunk[list(COLUNAS_EMPRESA.keys())].rename(columns=COLUNAS_EMPRESA)
                    df.to_sql('empresas', conn, if_exists='append', index=False)
                
                elif tipo == 'ESTABELECIMENTO':
                    # Filtrar apenas ATIVAS (situação == '02')
                    chunk = chunk[chunk[5] == '02'] 
                    if not chunk.empty:
                        df = chunk[list(COLUNAS_ESTABELECIMENTO.keys())].rename(columns=COLUNAS_ESTABELECIMENTO)
                        df['cnpj_full'] = df['cnpj_basico'] + df['cnpj_ordem'] + df['cnpj_dv']
                        df['telefone'] = "(" + df['ddd1'].fillna('') + ") " + df['tel1'].fillna('')
                        df_final = df[['cnpj_basico', 'cnpj_full', 'nome_fantasia', 'cnae', 'uf', 'municipio', 'telefone', 'email']]
                        df_final.to_sql('estabelecimentos', conn, if_exists='append', index=False)
                
                elif tipo == 'SOCIO':
                    df = chunk[list(COLUNAS_SOCIOS.keys())].rename(columns=COLUNAS_SOCIOS)
                    df.to_sql('socios', conn, if_exists='append', index=False)
    
    os.remove("temp.zip")
    print(f"✅ {filename} finalizado.")

def main():
    print("🚀 Iniciando extração inteligente...")
    conn = iniciar_db()
    
    xml_root = propfind(webdav_base)
    pastas = [name for name, is_dir in parse_items(xml_root) if is_dir and name.startswith("20")]
    ultima_referencia = sorted(pastas)[-1]
    path = ultima_referencia + "/"
    xml_pasta = propfind(webdav_base + path)
    
    arquivos = [webdav_base + path + name for name, is_dir in parse_items(xml_pasta, path) if name.endswith(".zip")]
    
    # Processar por tipos para garantir integridade do SQLite
    for url in arquivos:
        if "EMPRE" in url: processar_arquivo(url, 'EMPRESA', conn)
        elif "ESTABELE" in url: processar_arquivo(url, 'ESTABELECIMENTO', conn)
        elif "SOCIO" in url: processar_arquivo(url, 'SOCIO', conn)

    print("\n🔗 Cruzando dados finais (Join)...")
    # Criar a tabela final com o cruzamento
    query = """
    CREATE TABLE resultado_final AS
    SELECT 
        e.cnpj_full as CNPJ,
        emp.razao_social as RAZAO_SOCIAL,
        e.nome_fantasia as NOME_FANTASIA,
        e.cnae as CNAE,
        e.uf as UF,
        e.municipio as MUNICIPIO,
        e.telefone as TELEFONE,
        e.email as EMAIL,
        emp.porte as PORTE,
        emp.capital_social as CAPITAL_SOCIAL,
        GROUP_CONCAT(s.nome_socio, ' | ') as SOCIOS
    FROM estabelecimentos e
    LEFT JOIN empresas emp ON e.cnpj_basico = emp.cnpj_basico
    LEFT JOIN socios s ON e.cnpj_basico = s.cnpj_basico
    GROUP BY e.cnpj_full
    """
    conn.execute(query)
    conn.commit()
    
    print(f"🎉 Processo concluído! O arquivo '{db_name}' contém sua base filtrada.")
    conn.close()

if __name__ == "__main__":
    main()
