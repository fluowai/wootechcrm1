import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:10000/api/org/profile');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body Start:", text.substring(0, 100));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
