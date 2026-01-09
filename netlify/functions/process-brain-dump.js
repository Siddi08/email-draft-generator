exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { brainDump } = JSON.parse(event.body);

    if (!brainDump || !brainDump.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Brain dump content is required' })
      };
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are helping someone write an email. They've dumped all their thoughts below. Extract the key information and structure it into these fields:

1. emailType - choose ONE: professional-reply, cold-outreach, follow-up, complaint, thank-you, networking
2. recipient - who they're emailing
3. context - the situation/background (2-3 sentences max, clean and professional)
4. specificRequest - what they need from the recipient
5. deadline - any timeline/urgency mentioned
6. suggestedTone - recommend ONE: friendly, formal, or direct

Here's their brain dump:
"""
${brainDump}
"""

Return ONLY valid JSON in this exact format:
{
  "emailType": "...",
  "recipient": "...",
  "context": "...",
  "specificRequest": "...",
  "deadline": "...",
  "suggestedTone": "..."
}

If something isn't mentioned, use an empty string. Be concise and professional.`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to process brain dump' })
      };
    }

    const data = await response.json();

    if (data.content && data.content[0]?.text) {
      const jsonText = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(jsonText);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(extracted)
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Unexpected response format' })
      };
    }

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
