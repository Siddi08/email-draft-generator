exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { emailType, recipient, context, specificRequest, deadline, tone } = JSON.parse(event.body);

    if (!recipient || !context) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Recipient and context are required' })
      };
    }

    const emailTypes = {
      'professional-reply': 'Professional Reply',
      'cold-outreach': 'Cold Outreach',
      'follow-up': 'Follow-up / Reminder',
      'complaint': 'Complaint / Escalation',
      'thank-you': 'Thank You',
      'networking': 'Networking'
    };

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an expert email writer. Generate 3 variations of an email based on these details:

Email Type: ${emailTypes[emailType] || 'Follow-up'}
Recipient: ${recipient}
Context/Background: ${context}
Specific Request: ${specificRequest || 'Not specified'}
Deadline/Timeline: ${deadline || 'Not specified'}
Primary Tone: ${tone}

Generate 3 variations with these tones:
1. Friendly - warm, personable, but still professional
2. Formal - structured, respectful, traditional business tone
3. Direct - clear, concise, gets straight to the point

For each variation:
- Include a subject line
- Keep the email body concise (150-250 words)
- Make it ready to send (proper greeting, closing, etc.)
- Match the tone precisely
- Be natural, not robotic

Format your response as valid JSON:
{
  "friendly": {
    "subject": "...",
    "body": "..."
  },
  "formal": {
    "subject": "...",
    "body": "..."
  },
  "direct": {
    "subject": "...",
    "body": "..."
  }
}

Return ONLY the JSON, no other text.`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to generate emails' })
      };
    }

    const data = await response.json();

    if (data.content && data.content[0]?.text) {
      const jsonText = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const drafts = JSON.parse(jsonText);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(drafts)
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
