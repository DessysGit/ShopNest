import re


def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug from text"""
    # Convert to lowercase
    slug = text.lower()
    
    # Remove special characters and replace spaces with hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    
    return slug
