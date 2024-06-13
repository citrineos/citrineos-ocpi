const _postCredentialsPayload = {
  token: '321',
  url: 'http://localhost:8086',
  roles: [
    {
      role: 'EMSP',
      country_code: 'US',
      party_id: 'MSP',
      business_details: {
        name: 'Example Operator',
        website: 'http://example.com',
      },
    },
  ],
};