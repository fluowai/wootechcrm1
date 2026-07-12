import puppeteer from 'puppeteer';

async function runTests() {
  console.log('Starting frontend tests...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  try {
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.glass-card', { timeout: 5000 });
    console.log('Dashboard loaded successfully.');

    // Wait a bit for charts to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Navigation Links
    const links = await page.$$('nav a');
    for (const link of links) {
      const href = await page.evaluate(el => el.getAttribute('href'), link);
      const text = await page.evaluate(el => el.textContent, link);
      
      if (href && !href.includes('#') && text) {
        console.log(`Navigating to ${text} (${href})...`);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {}),
          link.click()
        ]);
        console.log(`Loaded ${text}.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error: any) {
    errors.push(`Test Execution Error: ${error.message}`);
  }

  await browser.close();

  console.log('\n--- Test Report ---');
  if (errors.length === 0) {
    console.log('✅ No errors found in the frontend!');
  } else {
    console.log(`❌ Found ${errors.length} errors:`);
    errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err}`);
    });
  }
}

runTests().catch(console.error);
