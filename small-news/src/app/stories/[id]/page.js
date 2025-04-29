import { fetchStory } from '@/lib/api';
import StoryContent from './StoryContent';

export async function generateMetadata({ params }) {
  const storyId = params.id;
  
  try {
    const storyResponse = await fetchStory(storyId);
    const story = storyResponse.success ? storyResponse.data.story : null;
    
    if (!story) {
      return {
        title: 'Story Not Found | NewsWorld',
        description: 'The requested story could not be found.',
      };
    }
    
    return {
      title: `${story.title} | NewsWorld Stories`,
      description: story.description || 'Read this curated story on NewsWorld',
      keywords: story.keywords?.join(', ') || '',
      openGraph: {
        title: story.title,
        description: story.description,
        url: `https://newsworld.com/stories/${storyId}`,
        type: 'article',
        publishedTime: story.createdAt,
        modifiedTime: story.updatedAt,
        section: story.categories?.[0] || 'News',
        tags: story.keywords || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: story.title,
        description: story.description,
      },
    };
  } catch (error) {
    return {
      title: 'Story | NewsWorld',
      description: 'Read curated news stories on NewsWorld',
    };
  }
}

export default async function StoryPage({ params }) {
  const storyId = params.id;
  
  try {
    // Fetch the story data
    const storyResponse = await fetchStory(storyId);
    const story = storyResponse.success ? storyResponse.data.story : null;
    
    // If story not found, return 404 message
    if (!story) {
      return (
        <div className="container py-5 text-center">
          <div className="py-5">
            <i className="bi bi-journal-x display-1 text-warning"></i>
            <h1 className="mt-4">Story Not Found</h1>
            <p className="lead text-muted">
              The story you're looking for doesn't exist or has been removed.
            </p>
            <a href="/stories" className="btn btn-primary mt-3">
              Browse All Stories
            </a>
          </div>
        </div>
      );
    }
    
    return <StoryContent story={story} />;
  } catch (error) {
    return (
      <div className="container py-5 text-center">
        <div className="py-5">
          <i className="bi bi-exclamation-triangle display-1 text-warning"></i>
          <h1 className="mt-4">Error Loading Story</h1>
          <p className="lead text-muted">
            We encountered an error while loading this story. Please try again later.
          </p>
          <a href="/stories" className="btn btn-primary mt-3">
            Browse All Stories
          </a>
        </div>
      </div>
    );
  }
} 