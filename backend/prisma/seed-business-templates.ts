import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    name: 'Venda Consultiva',
    slug: 'venda-consultiva',
    description: 'Para consultorias, assessorias, mentorias, serviços premium e alto ticket. Funil baseado em diagnóstico e proposta estratégica.',
    pipelineConfig: {
      stages: [
        { name: 'Lead Recebido', order: 0, probability: 10, isDefault: true, color: '#6B7280' },
        { name: 'Qualificação', order: 1, probability: 20, isDefault: false, color: '#3B82F6' },
        { name: 'Diagnóstico', order: 2, probability: 30, isDefault: false, color: '#8B5CF6' },
        { name: 'Reunião Estratégica', order: 3, probability: 45, isDefault: false, color: '#F59E0B' },
        { name: 'Proposta Enviada', order: 4, probability: 60, isDefault: false, color: '#10B981' },
        { name: 'Negociação', order: 5, probability: 75, isDefault: false, color: '#F97316' },
        { name: 'Fechado', order: 6, probability: 100, isDefault: false, color: '#22C55E' },
        { name: 'Onboarding', order: 7, probability: 90, isDefault: false, color: '#06B6D4' },
      ],
      customFields: [
        { name: 'Dor Principal', key: 'dor_principal', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Urgência', key: 'urgencia', type: 'SELECT', options: ['Baixa', 'Média', 'Alta', 'Imediata'], model: 'OPPORTUNITY' },
        { name: 'Orçamento Disponível', key: 'orcamento_disponivel', type: 'NUMBER', model: 'OPPORTUNITY' },
        { name: 'Decisor', key: 'decisor', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Concorrente', key: 'concorrente', type: 'TEXT', model: 'OPPORTUNITY' },
      ],
    },
    customFields: [
      { name: 'Segmento da Empresa', key: 'segmento_empresa', type: 'TEXT', model: 'CLIENT' },
      { name: 'Faturamento Estimado', key: 'faturamento_estimado', type: 'NUMBER', model: 'CLIENT' },
    ],
    tasks: [
      { title: 'Agendar call de qualificação', description: 'Entrar em contato para entender o cenário do lead', daysAfterStage: 1, stageName: 'Qualificação' },
      { title: 'Preparar diagnóstico prévio', description: 'Pesquisar a empresa e preparar perguntas estratégicas', daysAfterStage: 1, stageName: 'Diagnóstico' },
      { title: 'Realizar reunião de diagnóstico', description: 'Reunião com lead para levantamento de necessidades', daysAfterStage: 3, stageName: 'Diagnóstico' },
      { title: 'Elaborar proposta personalizada', description: 'Criar proposta baseada no diagnóstico realizado', daysAfterStage: 2, stageName: 'Proposta Enviada' },
      { title: 'Follow-up de proposta', description: 'Acompanhar lead após envio da proposta', daysAfterStage: 3, stageName: 'Negociação' },
      { title: 'Iniciar onboarding', description: 'Passar lead para equipe de operação e iniciar implementação', daysAfterStage: 1, stageName: 'Onboarding' },
    ],
    scripts: [
      { name: 'Abordagem Inicial', text: 'Olá {nome}, vi que você tem interesse em {servico}. Gostaria de entender melhor sua situação para ver como podemos ajudar. Tem 15 minutos para uma conversa rápida?', stage: 'Lead Recebido' },
      { name: 'Qualificação BANT', text: 'Para entender melhor, você poderia me contar: 1) Qual o principal desafio que está enfrentando? 2) Qual prazo para resolver isso? 3) Já tem orçamento previsto?', stage: 'Qualificação' },
      { name: 'Follow-up Proposta', text: 'Olá {nome}, tudo bem? Enviei a proposta no dia {data} e gostaria de saber se você teve oportunidade de analisar. Posso ajudar com alguma dúvida?', stage: 'Negociação' },
      { name: 'Pós-onboarding', text: 'Olá {nome}, seja bem-vindo(a)! Vamos iniciar nosso trabalho juntos. Nos próximos dias vou te acompanhar na implementação. Qual o melhor canal para nos falarmos?', stage: 'Onboarding' },
    ],
    playbook: [
      { title: 'Abordagem de Venda Consultiva', content: 'Na venda consultiva, o foco não é no produto, mas no diagnóstico. Pergunte mais do que fale. Entenda a dor, o impacto financeiro e a urgência. Só depois apresente a solução.' },
      { title: 'Critérios de Qualificação', content: 'Use BANT: Budget (tem orçamento?), Authority (fala com decisor?), Need (qual a dor?), Timeline (qual prazo?). Só avance se tiver pelo menos 3 critérios positivos.' },
      { title: 'Estrutura da Proposta', content: 'Toda proposta deve conter: 1) Resumo do diagnóstico, 2) Solução proposta, 3) Investimento, 4) Prazo de entrega, 5) Próximos passos. Personalize cada seção.' },
      { title: 'Negociação e Objeções', content: 'Antecipe objeções: preço, prazo, concorrência. Prepare respostas com cases reais. Nunca dê desconto sem pedir algo em troca (ex: fechamento no ato).' },
    ],
  },
  {
    name: 'Agência e Marketing',
    slug: 'agencia-marketing',
    description: 'Para agências de marketing, social media, tráfego pago e assessorias comerciais. Funil baseado em auditoria e plano estratégico.',
    pipelineConfig: {
      stages: [
        { name: 'Lead Recebido', order: 0, probability: 10, isDefault: true, color: '#6B7280' },
        { name: 'Auditoria', order: 1, probability: 25, isDefault: false, color: '#3B82F6' },
        { name: 'Call Estratégica', order: 2, probability: 40, isDefault: false, color: '#8B5CF6' },
        { name: 'Proposta', order: 3, probability: 60, isDefault: false, color: '#10B981' },
        { name: 'Fechamento', order: 4, probability: 100, isDefault: false, color: '#22C55E' },
        { name: 'Onboarding', order: 5, probability: 85, isDefault: false, color: '#06B6D4' },
        { name: 'Retenção', order: 6, probability: 90, isDefault: false, color: '#F59E0B' },
      ],
      customFields: [
        { name: 'Verba de Mídia', key: 'verba_midia', type: 'NUMBER', model: 'OPPORTUNITY' },
        { name: 'Canais Atuais', key: 'canais_atuais', type: 'MULTI_SELECT', options: ['Google Ads', 'Meta Ads', 'LinkedIn', 'TikTok', 'Orgânico', 'E-mail'], model: 'OPPORTUNITY' },
        { name: 'Faturamento Atual', key: 'faturamento_atual', type: 'NUMBER', model: 'OPPORTUNITY' },
        { name: 'Concorrência Principal', key: 'concorrencia_principal', type: 'TEXT', model: 'OPPORTUNITY' },
      ],
    },
    customFields: [
      { name: 'Segmento de Atuação', key: 'segmento_atuacao', type: 'TEXT', model: 'CLIENT' },
      { name: 'Ticket Médio Mês', key: 'ticket_medio_mes', type: 'NUMBER', model: 'CLIENT' },
    ],
    tasks: [
      { title: 'Realizar auditoria de presença digital', description: 'Analisar site, redes sociais, anúncios e concorrência', daysAfterStage: 2, stageName: 'Auditoria' },
      { title: 'Preparar apresentação de diagnóstico', description: 'Montar deck com resultados da auditoria', daysAfterStage: 2, stageName: 'Call Estratégica' },
      { title: 'Agendar call estratégica', description: 'Apresentar diagnóstico e proposta de solução', daysAfterStage: 3, stageName: 'Call Estratégica' },
      { title: 'Enviar proposta comercial', description: 'Preparar e enviar proposta detalhada', daysAfterStage: 2, stageName: 'Proposta' },
      { title: 'Iniciar onboarding do cliente', description: 'Coletar acessos, criar contas, configurar campanhas', daysAfterStage: 1, stageName: 'Onboarding' },
      { title: 'Reunião de alinhamento mensal', description: 'Apresentar resultados e planejar próximos passos', daysAfterStage: 30, stageName: 'Retenção' },
    ],
    scripts: [
      { name: 'Primeiro Contato', text: 'Oi {nome}, tudo bem? Fiz uma análise rápida da presença digital da {empresa} e identifiquei algumas oportunidades legais. Posso compartilhar com você?', stage: 'Lead Recebido' },
      { name: 'Agendamento Auditoria', text: 'Para fazer uma auditoria completa, preciso de alguns acessos. Você pode me passar: 1) Site 2) Redes sociais que usam 3) Se anunciam, qual plataforma?', stage: 'Auditoria' },
      { name: 'Follow-up Fechamento', text: 'Oi {nome}, tudo bem? Analisamos os dados da auditoria e montamos uma proposta sob medida para a {empresa}. Topa agendar 30 min para apresentarmos?', stage: 'Proposta' },
      { name: 'Retenção Mensal', text: 'Olá {nome}, tudo certo? Esse mês tivemos {resultado} de resultados. Vamos agendar nossa reunião de alinhamento para planejar o próximo mês?', stage: 'Retenção' },
    ],
    playbook: [
      { title: 'Abordagem de Agência', content: 'Nunca chegue vendendo. Chegue com dados. Faça uma mini-auditoria gratuita (site, redes, ads) e mostre gaps. A venda é baseada em valor percebido, não em preço.' },
      { title: 'Estrutura da Auditoria', content: 'Sempre audite: 1) Site (velocidade, SEO, conversão), 2) Redes (engajamento, frequência, conteúdo), 3) Tráfego (se anuncia, onde, ROI estimado). Apresente em deck visual.' },
      { title: 'Proposta de Agência', content: 'Inclua: diagnóstico atual, plano de ação (30-60-90 dias), investimento mensal, entregáveis, cases similares, métricas de sucesso.' },
      { title: 'Retenção de Clientes', content: 'Reunião mensal de resultados é obrigatória. Crie um reporting automático. Surpreenda com entregas extras. Peça indicação após 3 meses de resultados.' },
    ],
  },
  {
    name: 'Treinamento e Educação',
    slug: 'treinamento-educacao',
    description: 'Para empresas de treinamento, cursos, escolas livres, consultores e instrutores. Funil baseado em turmas e inscrições.',
    pipelineConfig: {
      stages: [
        { name: 'Interessado', order: 0, probability: 10, isDefault: true, color: '#6B7280' },
        { name: 'Qualificação', order: 1, probability: 25, isDefault: false, color: '#3B82F6' },
        { name: 'Apresentação', order: 2, probability: 50, isDefault: false, color: '#F59E0B' },
        { name: 'Inscrição/Proposta', order: 3, probability: 65, isDefault: false, color: '#10B981' },
        { name: 'Pagamento', order: 4, probability: 85, isDefault: false, color: '#22C55E' },
        { name: 'Turma Confirmada', order: 5, probability: 95, isDefault: false, color: '#06B6D4' },
        { name: 'Pós-Treinamento', order: 6, probability: 90, isDefault: false, color: '#8B5CF6' },
      ],
      customFields: [
        { name: 'Tipo de Curso', key: 'tipo_curso', type: 'SELECT', options: ['Presencial', 'Online', 'Híbrido', 'In Company'], model: 'OPPORTUNITY' },
        { name: 'Número de Alunos', key: 'numero_alunos', type: 'NUMBER', model: 'OPPORTUNITY' },
        { name: 'Área de Interesse', key: 'area_interesse', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Investimento Previsto', key: 'investimento_previsto', type: 'NUMBER', model: 'OPPORTUNITY' },
      ],
    },
    customFields: [
      { name: 'Empresa', key: 'empresa_vinculada', type: 'TEXT', model: 'LEAD' },
      { name: 'Cargo', key: 'cargo', type: 'TEXT', model: 'LEAD' },
    ],
    tasks: [
      { title: 'Agendar apresentação do curso', description: 'Entrar em contato para apresentar detalhes da formação', daysAfterStage: 2, stageName: 'Qualificação' },
      { title: 'Enviar material complementar', description: 'Enviar ementa, grade curricular e depoimentos', daysAfterStage: 1, stageName: 'Apresentação' },
      { title: 'Confirmar inscrição', description: 'Enviar link de inscrição e boleto/link de pagamento', daysAfterStage: 1, stageName: 'Inscrição/Proposta' },
      { title: 'Confirmar pagamento', description: 'Verificar confirmação de pagamento e enviar confirmação', daysAfterStage: 3, stageName: 'Pagamento' },
      { title: 'Enviar materiais pré-treinamento', description: 'Enviar material de preparação e instruções logísticas', daysAfterStage: 5, stageName: 'Turma Confirmada' },
      { title: 'Pesquisa de satisfação', description: 'Enviar pesquisa NPS e solicitar depoimento', daysAfterStage: 3, stageName: 'Pós-Treinamento' },
    ],
    scripts: [
      { name: 'Abordagem Inicial', text: 'Olá {nome}, tudo bem? Vi que você se interessou pelo curso {curso}. Gostaria de saber mais sobre o que vamos abordar? Posso te passar mais detalhes.', stage: 'Interessado' },
      { name: 'Apresentação', text: 'Oi {nome}, como combinado, aqui está um resumo do curso: {ementa}. Os principais benefícios são: {beneficios}. Gostaria de agendar uma conversa rápida para tirar dúvidas?', stage: 'Apresentação' },
      { name: 'Inscrição', text: 'Olá {nome}! Sua vaga está garantida? O link para inscrição é {link}. As turmas estão enchendo rápido, então recomendo garantir logo!', stage: 'Inscrição/Proposta' },
      { name: 'Pós-Curso', text: 'Olá {nome}, parabéns pela conclusão do curso! Adoraríamos saber sua opinião. Você pode responder 3 perguntas rápidas? {link_pesquisa}', stage: 'Pós-Treinamento' },
    ],
    playbook: [
      { title: 'Abordagem Educacional', content: 'Foco no resultado que o aluno terá, não no conteúdo do curso. Venda a transformação: "você vai sair capaz de...". Use cases de alunos anteriores.' },
      { title: 'Qualificação de Leads', content: 'Entenda: 1) Por que quer fazer o curso? 2) Já fez cursos similares? 3) Quem autoriza o investimento? (se for corporativo) 4) Prazo para decidir.' },
      { title: 'Follow-up de Vendas', content: 'Ciclo de venda educacional é mais longo. Faça follow-ups semanais com conteúdo de valor (artigos, cases). Crie urgência com prazos de turma.' },
      { title: 'Pós-Venda e Indicação', content: 'Aluno satisfeito é sua melhor fonte de leads. Peça indicação formal 1 semana após o curso. Ofereça desconto na próxima turma para indicações.' },
    ],
  },
  {
    name: 'Serviços Locais',
    slug: 'servicos-locais',
    description: 'Para empresas que vendem orçamento, agendamento e execução. Clínicas, escritórios, prestadores de serviço.',
    pipelineConfig: {
      stages: [
        { name: 'Solicitação', order: 0, probability: 10, isDefault: true, color: '#6B7280' },
        { name: 'Orçamento', order: 1, probability: 30, isDefault: false, color: '#3B82F6' },
        { name: 'Agendamento', order: 2, probability: 50, isDefault: false, color: '#F59E0B' },
        { name: 'Execução', order: 3, probability: 85, isDefault: false, color: '#10B981' },
        { name: 'Pagamento', order: 4, probability: 95, isDefault: false, color: '#22C55E' },
        { name: 'Avaliação', order: 5, probability: 100, isDefault: false, color: '#06B6D4' },
        { name: 'Recompra', order: 6, probability: 70, isDefault: false, color: '#8B5CF6' },
      ],
      customFields: [
        { name: 'Tipo de Serviço', key: 'tipo_servico', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Região', key: 'regiao', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Urgência', key: 'urgencia', type: 'SELECT', options: ['Baixa', 'Média', 'Alta', 'Emergencial'], model: 'OPPORTUNITY' },
        { name: 'Valor Orçado', key: 'valor_orcado', type: 'NUMBER', model: 'OPPORTUNITY' },
      ],
    },
    customFields: [
      { name: 'CEP', key: 'cep', type: 'TEXT', model: 'CLIENT' },
      { name: 'Prefere Contato', key: 'prefere_contato', type: 'SELECT', options: ['WhatsApp', 'Ligação', 'E-mail', 'Presencial'], model: 'LEAD' },
    ],
    tasks: [
      { title: 'Preparar orçamento', description: 'Calcular materiais, mão de obra e prazo', daysAfterStage: 1, stageName: 'Orçamento' },
      { title: 'Enviar orçamento', description: 'Enviar orçamento detalhado para o cliente', daysAfterStage: 1, stageName: 'Orçamento' },
      { title: 'Confirmar agendamento', description: 'Confirmar data, horário e endereço com o cliente', daysAfterStage: 1, stageName: 'Agendamento' },
      { title: 'Executar serviço', description: 'Realizar o serviço conforme combinado', daysAfterStage: 0, stageName: 'Execução' },
      { title: 'Cobrança', description: 'Emitir cobrança e confirmar pagamento', daysAfterStage: 0, stageName: 'Pagamento' },
      { title: 'Solicitar avaliação', description: 'Enviar pesquisa de satisfação', daysAfterStage: 2, stageName: 'Avaliação' },
      { title: 'Oferta de recompra', description: 'Entrar em contato para oferecer manutenção ou novo serviço', daysAfterStage: 60, stageName: 'Recompra' },
    ],
    scripts: [
      { name: 'Orçamento', text: 'Olá {nome}, tudo bem? Segue o orçamento para {servico} conforme conversamos. Valor: R$ {valor}. Prazo: {prazo}. Posso ajudar com mais alguma informação?', stage: 'Orçamento' },
      { name: 'Confirmação', text: 'Olá {nome}, passando para confirmar nosso agendamento para {data} às {hora} no endereço {endereco}. Qualquer mudança, é só avisar!', stage: 'Agendamento' },
      { name: 'Avaliação', text: 'Olá {nome}! Finalizamos o serviço e adoraríamos saber sua opinião. Você pode avaliar de 0 a 10? {link}', stage: 'Avaliação' },
      { name: 'Recompra', text: 'Olá {nome}! Já faz 2 meses desde o último serviço. Gostaria de agendar uma manutenção preventiva?', stage: 'Recompra' },
    ],
    playbook: [
      { title: 'Atendimento Local', content: 'Rapidez é tudo. Responda orçamentos em até 2 horas. Seja claro nos prazos e valores. Cliente local valoriza confiança e pontualidade.' },
      { title: 'Orçamento', content: 'Sempre detalhe: mão de obra, materiais, prazo, garantia. Orçamento claro = menos objeções. Inclua fotos de trabalhos anteriores.' },
      { title: 'Pós-Serviço', content: 'Cliente satisfeito indica. Peça avaliação no Google Meu Negócio. Ofereça desconto na próxima manutenção. Crie um programa de fidelidade simples.' },
      { title: 'Reativação', content: 'Clientes que não voltam em 3 meses: disparar campanha de reativação. Ofereça revisão gratuita ou desconto especial.' },
    ],
  },
  {
    name: 'B2B Comercial',
    slug: 'b2b-comercial',
    description: 'Para indústrias, distribuidores, SaaS, tecnologia e fornecedores empresariais. Funil completo com prospecção, follow-up e contratos.',
    pipelineConfig: {
      stages: [
        { name: 'Prospecção', order: 0, probability: 5, isDefault: true, color: '#6B7280' },
        { name: 'Conexão', order: 1, probability: 10, isDefault: false, color: '#3B82F6' },
        { name: 'Qualificação', order: 2, probability: 20, isDefault: false, color: '#8B5CF6' },
        { name: 'Reunião', order: 3, probability: 35, isDefault: false, color: '#F59E0B' },
        { name: 'Proposta', order: 4, probability: 50, isDefault: false, color: '#10B981' },
        { name: 'Follow-up', order: 5, probability: 60, isDefault: false, color: '#F97316' },
        { name: 'Contrato', order: 6, probability: 85, isDefault: false, color: '#22C55E' },
        { name: 'Implantação', order: 7, probability: 95, isDefault: false, color: '#06B6D4' },
      ],
      customFields: [
        { name: 'Porte da Empresa', key: 'porte_empresa', type: 'SELECT', options: ['MEI', 'Pequena', 'Média', 'Grande', 'Enterprise'], model: 'OPPORTUNITY' },
        { name: 'Número de Funcionários', key: 'numero_funcionarios', type: 'NUMBER', model: 'OPPORTUNITY' },
        { name: 'Decisor Principal', key: 'decisor_principal', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Solução Atual', key: 'solucao_atual', type: 'TEXT', model: 'OPPORTUNITY' },
        { name: 'Orçamento Anual', key: 'orcamento_anual', type: 'NUMBER', model: 'OPPORTUNITY' },
      ],
    },
    customFields: [
      { name: 'CNPJ', key: 'cnpj', type: 'TEXT', model: 'CLIENT' },
      { name: 'Website', key: 'website', type: 'TEXT', model: 'CLIENT' },
      { name: 'Segmento de Mercado', key: 'segmento_mercado', type: 'TEXT', model: 'CLIENT' },
    ],
    tasks: [
      { title: 'Pesquisar empresa-alvo', description: 'Levantar dados da empresa, decisores e dores potenciais', daysAfterStage: 1, stageName: 'Prospecção' },
      { title: 'Abordagem inicial', description: 'Enviar mensagem personalizada ou e-mail de apresentação', daysAfterStage: 2, stageName: 'Conexão' },
      { title: 'Agendar reunião comercial', description: 'Propor reunião para apresentar solução', daysAfterStage: 3, stageName: 'Qualificação' },
      { title: 'Realizar reunião', description: 'Apresentar solução e levantar necessidades específicas', daysAfterStage: 5, stageName: 'Reunião' },
      { title: 'Elaborar proposta', description: 'Criar proposta comercial personalizada', daysAfterStage: 2, stageName: 'Proposta' },
      { title: 'Follow-up semanal', description: 'Acompanhar lead semanalmente após proposta', daysAfterStage: 7, stageName: 'Follow-up' },
      { title: 'Preparar contrato', description: 'Elaborar contrato com base na proposta aceita', daysAfterStage: 2, stageName: 'Contrato' },
      { title: 'Iniciar implantação', description: 'Passar para equipe de implantação e agendar kickoff', daysAfterStage: 3, stageName: 'Implantação' },
    ],
    scripts: [
      { name: 'Abordagem por LinkedIn', text: 'Olá {nome}, tudo bem? Vi que você atua na {empresa} e achei interessante o trabalho de vocês em {segmento}. Temos ajudado empresas similares a {beneficio}. Trocaria uma ideia rápida?', stage: 'Prospecção' },
      { name: 'Qualificação', text: '{nome}, para entender melhor se podemos ajudar: 1) Como fazem {processo} atualmente? 2) Qual o maior desafio com isso? 3) Existe projeto para melhorar?', stage: 'Qualificação' },
      { name: 'Pós-Reunião', text: 'Oi {nome}, obrigado pela reunião! Como combinado, segue um resumo do que falamos: {resumo}. Vou preparar a proposta e enviar em até 2 dias.', stage: 'Reunião' },
      { name: 'Follow-up Proposta', text: 'Olá {nome}, tudo bem? Faz uma semana que enviei a proposta. Teve chance de analisar? Posso esclarecer qualquer dúvida.', stage: 'Follow-up' },
      { name: 'Kickoff Implantação', text: 'Olá {nome}, contrato assinado! Vamos agendar o kickoff de implantação. Na reunião vamos alinhar cronograma, responsáveis e próximos passos.', stage: 'Implantação' },
    ],
    playbook: [
      { title: 'Prospecção B2B', content: 'Qualidade > quantidade. Pesquise a empresa antes de abordar. Personalize a mensagem. LinkedIn é o melhor canal para B2B. Tenha um ICP (Perfil de Cliente Ideal) definido.' },
      { title: 'Qualificação B2B', content: 'Além de BANT (Budget, Authority, Need, Timeline), use MEDDIC: Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion.' },
      { title: 'Follow-up Estratégico', content: 'B2B tem ciclo longo (30-90 dias). Faça follow-ups com conteúdo de valor, não só "só lembrando". Compartilhe cases, artigos, datas de webinar. Use CRM para não perder prazos.' },
      { title: 'Implantação', content: 'A implantação é onde o cliente decide se renova ou não. Tenha um onboarding estruturado com milestones claros. Atribua um CS (Customer Success) desde o início.' },
    ],
  },
];

async function main() {
  console.log('🌱 Iniciando seed de templates de operação comercial...\n');

  for (const template of TEMPLATES) {
    await prisma.businessTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        pipelineConfig: template.pipelineConfig as any,
        customFields: template.customFields as any,
        tasks: template.tasks as any,
        scripts: template.scripts as any,
        playbook: template.playbook as any,
        isActive: true,
      },
      create: {
        name: template.name,
        slug: template.slug,
        description: template.description,
        pipelineConfig: template.pipelineConfig as any,
        customFields: template.customFields as any,
        tasks: template.tasks as any,
        scripts: template.scripts as any,
        playbook: template.playbook as any,
        isActive: true,
      },
    });
    console.log(`  ✅ Template "${template.name}" (${template.slug}) sincronizado`);
  }

  console.log('\n🎯 Seed de templates concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
