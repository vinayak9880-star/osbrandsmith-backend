const express = require('express');
const https = require('https');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PLAN_ID = 'plan_ShDfJ8N6OyDgri';

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OS Brandsmith Backend Running!' });
});

// Create Subscription
app.post('/create-subscription', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const data = JSON.stringify({
      plan_id: PLAN_ID,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { name, email, phone }
    });

    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.razorpay.com',
        path: '/v1/subscriptions',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      const req = https.request(options, (r) => {
        let body = '';
        r.on('data', chunk => body += chunk);
        r.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (result.error) {
      return res.status(400).json({ error: result.error.description });
    }

    res.json({ subscription_id: result.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment
app.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
    const text = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const generated = crypto.createHmac('sha256', KEY_SECRET).update(text).digest('hex');
    res.json({ verified: generated === razorpay_signature });
  } catch (err) {
    res.status(500).json({ verified: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
