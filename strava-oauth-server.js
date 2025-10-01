// strava-oauth-server.js
// Simple OAuth callback server for Strava integration
// Deploy this to a web server like Vercel, Netlify, or your own domain

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Strava OAuth callback endpoint
app.get('/auth/strava/callback', async (req, res) => {
  const { code, state, error, scope } = req.query;
  
  console.log('Strava OAuth callback received:', { code: code?.substring(0, 10) + '...', state, error, scope });
  
  if (error) {
    console.error('Strava OAuth error:', error);
    return res.status(400).send(`
      <html>
        <head><title>Strava Authorization Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Strava Authorization Failed</h2>
          <p>Error: ${error}</p>
          <p>Please try again in the MinakamiApp.</p>
        </body>
      </html>
    `);
  }
  
  if (!code) {
    return res.status(400).send(`
      <html>
        <head><title>Missing Authorization Code</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ No Authorization Code</h2>
          <p>No authorization code received from Strava.</p>
          <p>Please try again in the MinakamiApp.</p>
        </body>
      </html>
    `);
  }
  
  // Generate deep link back to app
  const deepLink = `minakamiapp://strava-auth?code=${code}&state=${state}`;
  
  // Return success page with deep link
  res.send(`
    <html>
      <head>
        <title>Strava Authorization Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial; text-align: center; padding: 20px; background: #f8f9fa;">
        <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #FC4C02; margin-bottom: 20px;">✅ Strava Authorization Success!</h2>
          <p style="color: #666; margin-bottom: 30px;">
            Je Strava account is succesvol geautoriseerd. 
            Klik op de knop hieronder om terug te gaan naar MinakamiApp.
          </p>
          
          <a href="${deepLink}" 
             style="display: inline-block; background: #FC4C02; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 20px;">
            🔄 Ga terug naar MinakamiApp
          </a>
          
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              Als de knop niet werkt, kopieer deze link naar je browser:
            </p>
            <p style="font-size: 12px; color: #999; word-break: break-all; margin: 10px 0 0 0;">
              ${deepLink}
            </p>
          </div>
        </div>
        
        <script>
          // Auto-redirect after 3 seconds
          setTimeout(function() {
            window.location.href = '${deepLink}';
          }, 3000);
          
          // Log for debugging
          console.log('Strava OAuth success, redirecting to:', '${deepLink}');
        </script>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'MinakamiApp Strava OAuth Server' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>MinakamiApp OAuth Server</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>🚴 MinakamiApp Strava OAuth Server</h2>
        <p>This server handles Strava OAuth callbacks for the MinakamiApp.</p>
        <p>Status: ✅ Running</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚴 MinakamiApp Strava OAuth server running on port ${PORT}`);
  console.log(`📍 Callback URL: https://api.minakamiapp.com/auth/strava/callback`);
});

module.exports = app;