const express = require('express');
const axios = require('axios');
const csv = require('csvtojson');

const app = express();
const PORT = process.env.PORT || 3000;

// Your published Google Sheet CSV URL
const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXizltQgNXkoeFOJNhUTNxUp3uolqaQyHkyCP9i1_5hkcvFeeWAb0ffHSHCPzZmFzm1PuV1VBoiexX/pub?output=csv';

app.get('/', (req, res) => {
  res.send('Customer API Running 🚀');
});

app.get('/customer', async (req, res) => {
  try {
    const phone = req.query.phone;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number required'
      });
    }

    // Fetch CSV from Google Sheets
    const response = await axios.get(SHEET_URL);

    // Convert CSV → JSON
    const customers = await csv().fromString(response.data);

    // Find matching customer
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
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});