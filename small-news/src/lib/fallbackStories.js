// Fallback stories data when API isn't available
const fallbackStories = {
  'climate-summit-2023': {
    _id: 'climate-summit-2023',
    title: 'Climate Summit 2023: Global Leaders Tackle Environmental Challenges',
    description: 'Follow the developments from the 2023 United Nations Climate Change Conference as world leaders negotiate new environmental policies.',
    summary: 'The 2023 Climate Summit has brought together leaders from over 190 countries to address urgent climate concerns and negotiate new policies to reduce global carbon emissions. With record-breaking temperatures and climate disasters in recent years, the stakes for meaningful action have never been higher.',
    categories: ['Environment', 'Politics', 'Global'],
    keywords: ['climate change', 'global warming', 'sustainability', 'carbon emissions', 'renewable energy', 'paris agreement', 'cop28'],
    articleCount: 12,
    articles: [
      {
        _id: 'climate-article-1',
        title: 'World Leaders Pledge Ambitious Carbon Cuts at Climate Summit',
        description: 'Over 150 countries have announced new targets to reduce emissions by 2030, with major economies promising carbon neutrality by 2050.',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Global News Network' },
        url: '/news/climate-article-1'
      },
      {
        _id: 'climate-article-2',
        title: 'Climate Activists Demand Faster Action Outside Summit',
        description: 'Thousands of protesters gathered to call for more aggressive climate policies, saying current pledges are insufficient to prevent catastrophic warming.',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Independent Press' },
        url: '/news/climate-article-2'
      },
      {
        _id: 'climate-article-3',
        title: 'Developing Nations Secure Climate Finance Commitments',
        description: 'After tense negotiations, wealthy nations agreed to increase funding to help vulnerable countries adapt to climate impacts and transition to clean energy.',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'World Affairs' },
        url: '/news/climate-article-3'
      }
    ],
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    relevancyScore: 85,
    content: '<p>The Climate Summit represents a critical moment in the ongoing global effort to address climate change. With scientific consensus warning that the window for preventing catastrophic warming is rapidly closing, nations are under immense pressure to move beyond promises to concrete action.</p><p>Key issues on the agenda include:</p><ul><li>Accelerating the phase-out of fossil fuels</li><li>Increasing climate finance for developing nations</li><li>Strengthening adaptation measures for climate-vulnerable regions</li><li>Creating accountability mechanisms for climate commitments</li></ul><p>The outcomes of this summit will significantly influence global climate policy for years to come.</p>',
    keyFacts: [
      'Over 190 countries are participating in the summit',
      'Current global policies put the world on track for 2.8°C warming by 2100',
      'The summit aims to strengthen the Paris Agreement targets',
      'Climate finance for developing nations is a central point of negotiation'
    ],
    timeline: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      ongoing: true
    }
  },
  'tech-innovation-race': {
    _id: 'tech-innovation-race',
    title: 'The AI Revolution: Tech Giants Compete for Dominance',
    description: 'Explore how major technology companies are competing to lead the artificial intelligence revolution and how it\'s transforming industries.',
    summary: 'The race for AI dominance has intensified dramatically over the past year, with tech giants investing billions in advanced models and applications. From generative AI to autonomous systems, companies are vying to establish leadership in what many believe will be the most transformative technology of our era.',
    categories: ['Technology', 'Business', 'Innovation'],
    keywords: ['artificial intelligence', 'machine learning', 'tech industry', 'innovation', 'GPT', 'neural networks', 'big tech'],
    articleCount: 8,
    articles: [
      {
        _id: 'ai-article-1',
        title: 'OpenAI Announces GPT-5 with Revolutionary Capabilities',
        description: 'The latest GPT model demonstrates unprecedented reasoning abilities and multimodal capabilities, setting new benchmarks for AI systems.',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Tech Insider' },
        url: '/news/ai-article-1'
      },
      {
        _id: 'ai-article-2',
        title: 'Google Accelerates AI Integration Across Product Ecosystem',
        description: 'From search to workspace applications, Google is embedding advanced AI capabilities throughout its platform to maintain competitive advantage.',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Digital Trends' },
        url: '/news/ai-article-2'
      },
      {
        _id: 'ai-article-3',
        title: 'Microsoft's AI Investment Strategy Pays Off with Record Growth',
        description: 'After investing heavily in AI infrastructure and partnerships, Microsoft reports substantial revenue growth in cloud services and AI applications.',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Business Technology Review' },
        url: '/news/ai-article-3'
      }
    ],
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    relevancyScore: 78,
    content: '<p>The competition to lead the artificial intelligence revolution has reached unprecedented intensity, with companies investing billions in research, talent acquisition, and infrastructure. This technology race is reshaping not only the tech industry but virtually every sector of the global economy.</p><p>Key developments include:</p><ul><li>Major leaps in large language model capabilities and accessibility</li><li>Integration of AI into enterprise software and consumer applications</li><li>Development of specialized AI chips and accelerators</li><li>Expanding application of AI in healthcare, transportation, and creative industries</li></ul><p>As AI capabilities continue to advance at a rapid pace, questions about governance, ethics, and economic impact have become increasingly urgent.</p>',
    keyFacts: [
      'Global AI investment exceeded $120 billion in the past year',
      'The top 5 tech companies account for over 60% of AI research publications',
      'AI capabilities are doubling approximately every 6 months',
      'Regulatory frameworks for AI are still developing in most countries'
    ],
    timeline: {
      startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      ongoing: true
    }
  },
  'global-health-pandemic': {
    _id: 'global-health-pandemic',
    title: 'Global Health: Tackling the Next Pandemic',
    description: 'Investigating how nations are preparing for future health crises and what lessons have been learned from recent global pandemics.',
    summary: 'In the aftermath of COVID-19, governments and health organizations worldwide are implementing new strategies and systems to detect, contain, and respond to emerging infectious diseases. This story examines the progress made in pandemic preparedness and the challenges that remain.',
    categories: ['Health', 'Science', 'Global'],
    keywords: ['pandemic', 'public health', 'disease prevention', 'WHO', 'vaccines', 'global health security', 'pathogen monitoring'],
    articleCount: 10,
    articles: [
      {
        _id: 'pandemic-article-1',
        title: 'WHO Launches Global Early Warning System for Disease Outbreaks',
        description: 'The new system integrates AI-powered surveillance, genomic sequencing networks, and rapid response protocols to identify potential pandemics before they spread.',
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Health Affairs' },
        url: '/news/pandemic-article-1'
      },
      {
        _id: 'pandemic-article-2',
        title: 'Scientists Develop Universal Coronavirus Vaccine Platform',
        description: 'Researchers announce breakthrough in vaccine technology that could provide broad protection against multiple coronavirus variants and related viruses.',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Medical Science Today' },
        url: '/news/pandemic-article-2'
      },
      {
        _id: 'pandemic-article-3',
        title: 'Global Pandemic Treaty Faces Opposition Despite Urgent Need',
        description: 'International negotiations for a binding pandemic response framework encounter resistance from countries concerned about sovereignty and economic impacts.',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'International Health Policy' },
        url: '/news/pandemic-article-3'
      }
    ],
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    relevancyScore: 82,
    content: '<p>The COVID-19 pandemic exposed critical gaps in global health security and preparedness. Three years later, significant efforts are underway to strengthen detection and response capabilities for future infectious disease threats.</p><p>Key areas of focus include:</p><ul><li>Enhancing global surveillance networks for emerging pathogens</li><li>Developing rapid-response vaccine platforms</li><li>Strengthening healthcare system resilience</li><li>Creating more equitable frameworks for sharing resources during health emergencies</li></ul><p>While progress has been made in some areas, experts warn that many countries remain vulnerable to future pandemics due to underinvestment in public health infrastructure and continued barriers to international cooperation.</p>',
    keyFacts: [
      'Experts predict a 47-57% chance of another pandemic in the next 25 years',
      'Global spending on pandemic preparedness has increased by 30% since 2020',
      'Over 60 countries have established or expanded pathogen genomic sequencing capabilities',
      'The economic impact of COVID-19 exceeded $16 trillion globally'
    ],
    timeline: {
      startDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      ongoing: true
    }
  }
};

/**
 * Get a fallback story by ID
 */
export function getFallbackStory(id) {
  return fallbackStories[id] || null;
}

/**
 * Get all fallback stories
 */
export function getAllFallbackStories() {
  return Object.values(fallbackStories);
}

export default fallbackStories;