# AI Configuration Guide

This guide explains how to configure AI API keys for the POS Recognition Optimization feature.

## Overview

The POS Recognition system supports three approaches:
- **Frontend (Free)**: Always available, 80%+ accuracy
- **AI (Paid)**: Requires API key, 95%+ accuracy target
- **NLP (Optional)**: Requires backend server, 90%+ accuracy target

## Task 12.1: Configuring AI API Keys

### Option 1: Using Chrome Extension Settings (Recommended)

1. Open the Chrome extension popup
2. Navigate to Settings → POS Recognition
3. Enable "AI-Enhanced Recognition"
4. Enter your API configuration:
   - **API URL**: `https://api.openai.com/v1/chat/completions`
   - **API Key**: Your OpenAI API key (starts with `sk-`)
   - **Model**: `gpt-4` or `gpt-3.5-turbo`
   - **Temperature**: `0.3` (recommended for consistency)

5. Click "Save" and "Test Connection"

### Option 2: Using Chrome Storage API (For Development)

```javascript
// Set AI configuration in Chrome storage
chrome.storage.local.set({
  aiSettings: {
    enabled: true,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-your-api-key-here',
    model: 'gpt-4',
    temperature: 0.3
  }
}, () => {
  console.log('AI settings saved');
});
```

### Option 3: Using Environment Variables (For Testing)

```bash
# Set environment variables
export OPENAI_API_KEY="sk-your-api-key-here"
export OPENAI_MODEL="gpt-4"
export OPENAI_API_URL="https://api.openai.com/v1/chat/completions"
```

## Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-`)
6. **Important**: Store the key securely - you won't be able to see it again

## Testing AI Connection

### Method 1: Using the Extension UI

1. After configuring the API key, click "Test Connection"
2. The system will attempt to analyze a test sentence
3. You should see a success message if the connection works

### Method 2: Using the Test Suite

```bash
# Run AI verification tests
npm test -- ai-verification.test.ts

# The tests will automatically detect if API keys are configured
# and run appropriate tests
```

### Method 3: Manual Testing

```javascript
// In browser console or test file
import { OpenAITranslationService } from './services/ai-translation-service';

const config = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-your-api-key-here',
  model: 'gpt-4',
  temperature: 0.3,
  timeout: 5000
};

const service = new OpenAITranslationService(config);

// Test the service
const result = await service.getPOSOnly('The broken window');
console.log('AI Result:', result);
```

## Verification Checklist

- [ ] API key is valid and active
- [ ] API URL is correct
- [ ] Model name is supported (gpt-4, gpt-3.5-turbo)
- [ ] Temperature is between 0 and 1
- [ ] Timeout is reasonable (5000ms recommended)
- [ ] Test connection succeeds
- [ ] AI analysis returns valid POS tags

## Troubleshooting

### Error: "AI service timeout"

**Cause**: Request took longer than timeout setting (default 5s)

**Solutions**:
- Check your internet connection
- Increase timeout in settings
- Verify OpenAI API status
- Try a different model (gpt-3.5-turbo is faster)

### Error: "Invalid API key"

**Cause**: API key is incorrect or expired

**Solutions**:
- Verify the API key is correct
- Check if the key has been revoked
- Generate a new API key
- Ensure the key starts with `sk-`

### Error: "Rate limit exceeded"

**Cause**: Too many requests to OpenAI API

**Solutions**:
- Wait a few minutes before retrying
- Upgrade your OpenAI plan
- Enable caching to reduce API calls
- Use frontend approach temporarily

### Error: "Model not found"

**Cause**: Model name is incorrect or not available

**Solutions**:
- Use `gpt-4` or `gpt-3.5-turbo`
- Check OpenAI documentation for available models
- Verify your account has access to the model

## Fallback Behavior

The system automatically falls back when AI is unavailable:

1. **AI Service** (Paid users, 95% accuracy target)
   ↓ (if fails)
2. **NLP Service** (Optional backend, 90% accuracy)
   ↓ (if fails)
3. **Frontend Analyzer** (Always available, 80%+ accuracy)

This ensures the extension always works, even without AI configuration.

## Cost Considerations

### OpenAI API Pricing (as of 2024)

- **GPT-4**: ~$0.03 per 1K tokens
- **GPT-3.5-Turbo**: ~$0.002 per 1K tokens

### Estimated Costs

For typical usage (analyzing 100 sentences per day):
- **GPT-4**: ~$0.30 - $0.50 per day
- **GPT-3.5-Turbo**: ~$0.02 - $0.05 per day

### Cost Optimization Tips

1. **Enable Caching**: Reduces duplicate API calls
2. **Use GPT-3.5-Turbo**: Much cheaper, still good accuracy
3. **Set User Tier Appropriately**: Free users use frontend only
4. **Monitor Usage**: Check OpenAI dashboard regularly

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for development
3. **Rotate keys regularly** (every 90 days)
4. **Set usage limits** in OpenAI dashboard
5. **Monitor for unusual activity**
6. **Use separate keys** for development and production

## User Tier Configuration

### Free Tier (Default)

```javascript
{
  tier: 'free',
  preferredApproach: 'auto', // Will use frontend
  enableCache: true
}
```

### Paid Tier (AI Enabled)

```javascript
{
  tier: 'paid',
  preferredApproach: 'auto', // Will use AI → NLP → Frontend
  enableCache: true
}
```

## Next Steps

After configuring AI:

1. Run the verification tests (Task 12.2-12.5)
2. Monitor accuracy and performance
3. Adjust settings based on results
4. Consider cost vs. accuracy tradeoffs

## Support

For issues or questions:
- Check the troubleshooting section above
- Review test results in `ai-verification.test.ts`
- Check browser console for error messages
- Verify OpenAI API status at status.openai.com
