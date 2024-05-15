import express from 'express';
import { google } from 'googleapis';

const app = express();

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'YOUR_REDIRECT_URI'
});

// Set the access token if available (you may retrieve this from your database)
let accessToken = 'RETRIEVED_ACCESS_TOKEN';

// Middleware to check if the access token is still valid
const checkAccessToken = (req, res, next) => {
  if (!accessToken) {
    res.status(401).send('Access token missing. Please sign in again.');
  } else {
    // Check if the access token is still valid
    google.accounts.testToken({
      auth: oauth2Client,
      token: accessToken
    }).then(() => {
      // Access token is still valid, proceed to next middleware
      next();
    }).catch((err) => {
      // Access token is invalid, revoke access
      revokeAccess()
        .then(() => {
          res.status(401).send('Access revoked. Please sign in again.');
        })
        .catch((revokeErr) => {
          console.error('Error revoking access:', revokeErr);
          res.status(500).send('Internal server error');
        });
    });
  }
};

// Revoke access function
const revokeAccess = async () => {
  try {
    await google.accounts.revoke({
      auth: oauth2Client
    });
    console.log('Access revoked');
    // Clear access token from your database or session
    accessToken = null;
  } catch (err) {
    throw new Error('Failed to revoke access');
  }
};

// Route for sign-in
app.get('/signin', (req, res) => {
  // Redirect to Google sign-in page
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile']
  });
  res.redirect(authUrl);
});

// Callback route after user signs in with Google
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Store the access token in your database or session
    accessToken = tokens.access_token;
    // Redirect user to dashboard or desired page
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error exchanging code for tokens:', err);
    res.status(500).send('Internal server error');
  }
});

// Protected route - user must be signed in
app.get('/dashboard', checkAccessToken, (req, res) => {
  res.send('Welcome to your dashboard!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
