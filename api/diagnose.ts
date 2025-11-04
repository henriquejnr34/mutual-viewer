
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { X_CLIENT_ID, X_CLIENT_SECRET } = process.env;

    if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
        return res.status(200).json({
            status: 'ENV_VAR_MISSING',
            message: "The `X_CLIENT_ID` and/or `X_CLIENT_SECRET` environment variables are not set on the server. Please set them in your hosting platform's settings and redeploy."
        });
    }

    try {
        const tokenUrl = 'https://api.twitter.com/oauth2/token';
        const authHeader = `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`;
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorBody = await response.json();
            if (errorBody.reason === 'client-not-enrolled') {
                return res.status(200).json({
                    status: 'CONFIG_ERROR',
                    message: "The API keys configured on the server are for an app that is not properly set up in a Project. Please ensure you have regenerated the 'API Key and Secret' from within your Project on the X Developer Portal, updated the environment variables, and redeployed your application."
                });
            }
             // Handle other potential auth errors
            return res.status(200).json({
                status: 'CONFIG_ERROR',
                message: `The API keys seem to be invalid. X API returned an error: ${errorBody.error_description || errorBody.detail || 'Unknown Error'}. Please double-check your keys.`
            });
        }
        
        // If we get a token, it means the keys are valid.
        // The error the user is seeing must be related to user-context permissions.
        await response.json();
        return res.status(200).json({
            status: 'OK',
            message: "Verification Success: The server's API keys are valid and can authenticate with X. If you still see an error, the issue may be related to the specific permissions required for reading user data. Ensure your app has the necessary scopes authorized."
        });


    } catch (error: any) {
        console.error("Diagnosis failed:", error);
        return res.status(500).json({
            status: 'ERROR',
            message: `An unexpected error occurred during diagnosis: ${error.message}`
        });
    }
}
