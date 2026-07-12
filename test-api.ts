
async function test() {
  const baseUrl = 'http://localhost:10000';
  
  console.log('--- Testing API ---');

  // 1. Create Organization
  const orgResponse = await fetch(`${baseUrl}/api/admin/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nexus Test Agency', plan: 'Enterprise', domain: 'nexus-test.com' })
  });
  const org = await orgResponse.json();
  console.log('Organization created:', org);

  if (!org.id) {
    console.error('Failed to create organization');
    return;
  }

  const orgId = org.id;

  // 2. Create Lead
  const leadResponse = await fetch(`${baseUrl}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      status: 'novo',
      value: 5000,
      source: 'Google Ads',
      orgId: orgId
    })
  });
  const lead = await leadResponse.json();
  console.log('Lead created:', lead);

  // 3. Create Client
  const clientResponse = await fetch(`${baseUrl}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corporateName: 'Empresa Teste LTDA',
      email: 'contato@empresateste.com',
      orgId: orgId
    })
  });
  const client = await clientResponse.json();
  console.log('Client created:', client);

  // 4. Create Project
  const projectResponse = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Projeto Web',
      description: 'Implementação de novo site',
      status: 'planejamento',
      orgId: orgId
    })
  });
  const project = await projectResponse.json();
  console.log('Project created:', project);

  // 5. Create Task
  const taskResponse = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Configurar servidor',
      description: 'Setup inicial do ambiente',
      status: 'pendente',
      priority: 'alta',
      orgId: orgId
    })
  });
  const task = await taskResponse.json();
  console.log('Task created:', task);

  console.log('--- Test Finished ---');
}

test().catch(console.error);
