import posthog from 'posthog-js';

posthog.init('phc_PwMkJR1CqxiZ43irZeILv4DIilEpNIzxYNa9vVh7UZ9', {
  api_host: 'https://app.posthog.com',
  capture_pageview: false,
});

export { posthog };
