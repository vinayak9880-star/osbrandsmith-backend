const express = require('express');
const https = require('https');
const crypto = require('crypto');

const app = express();

// CORS - allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PLAN_ID = 'plan_ShDfJ8N6OyDgri';

app.get('/', (req, res) => {
  res.json({ status: 'OS Brandsmith Backend Running!' });
});

app.post('/create-subscription', async (req, res) => {
  try {
    console.log('Creating subscription for:', req.body);
    
    const { name, email, phone } = req.body;

    const data = JSON.stringify({
      plan_id: PLAN_ID,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { name: name || '', email: email || '', phone: phone || '' }
    });

    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    console.log('Using KEY_ID:', KEY_ID ? KEY_ID.substring(0, 10) + '...' : 'NOT SET');

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.razorpay.com',
        path: '/v1/subscriptions',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      
      const req2 = https.request(options, (r) => {
        let body = '';
        r.on('data', chunk => body += chunk);
        r.on('end', () => {
          console.log('Razorpay response:', body.substring(0, 200));
          try { resolve(JSON.parse(body)); } 
          catch(e) { reject(new Error('Invalid JSON: ' + body)); }
        });
      });
      req2.on('error', reject);
      req2.write(data);
      req2.end();
    });

    if (result.error) {
      console.log('Razorpay error:', result.error);
      return res.status(400).json({ error: result.error.description });
    }

    console.log('Subscription created:', result.id);
    res.json({ subscription_id: result.id });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
