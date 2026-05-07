const express = require('express');
const axios = require('axios');
const csv = require('csvtojson');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());


// ========================================
// GOOGLE SHEET CONFIG
// ========================================

// Public CSV URL for customer data
const CUSTOMER_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXizltQgNXkoeFOJNhUTNxUp3uolqaQyHkyCP9i1_5hkcvFeeWAb0ffHSHCPzZmFzm1PuV1VBoiexX/pub?output=csv';

// Your Spreadsheet ID
const SPREADSHEET_ID =
  '1FcjUemE9PBsUlTgSOcqlgxvaZQAIDkAQ641mXEYf8jE';


// ========================================
// GOOGLE AUTH
// ========================================

let auth;

// Check if running on Render with env variable
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
} else {
  // Local development
  auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

const sheets = google.sheets({
  version: 'v4',
  auth
});


// ========================================
// HOME ROUTE
// ========================================

app.get('/', (req, res) => {
  res.send('🚀 Customer API Running');
});


// ========================================
// GET CUSTOMER DETAILS
// ========================================

app.get('/customer', async (req, res) => {

  try {

    const phone = req.query.phone;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number required'
      });
    }

    // Fetch CSV from Google Sheet
    const response = await axios.get(CUSTOMER_SHEET_URL);

    // Convert CSV → JSON
    const customers = await csv().fromString(response.data);

    // Find customer by phone
    const customer = customers.find(
      c => c.phone.toString() === phone.toString()
    );

    if (!customer) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Customer not found'
      });
    }

    return res.json({
      status: 'success',
      data: customer
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});


// ========================================
// POST WEBHOOK
// ========================================

app.post('/webhook', async (req, res) => {

  try {

    const data = req.body;

    console.log('Webhook Received:', data);

    // Prepare row
    const row = [

      data.time || '',
      data.agentId || '',
      data.callId || '',
      data.targetNumber || '',
      data.callDuration || '',
      data.status || '',

      data.extractedData?.confirmationStatus || '',
      data.extractedData?.preferredTime || '',
      data.extractedData?.requestedCallback || '',

      data.metadata?.customerName || '',
      data.metadata?.appointmentTime || '',

      data.chatHistory || '',
      data.bulkRequestId || ''

    ];

    // Append to WebhookLogs sheet
    await sheets.spreadsheets.values.append({

      spreadsheetId: SPREADSHEET_ID,

      range: 'WebhookLogs!A:M',

      valueInputOption: 'USER_ENTERED',

      requestBody: {
        values: [row]
      }

    });

    return res.json({
      status: 'success',
      message: 'Webhook stored successfully'
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});