import { useState, useEffect } from 'react';
import { db } from '../lib/db';

const imageCache = new Map<string, string>();

export const useIndexedDBImage = (imageId: string, fallbackUrl?: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      if (!imageId) {
        setLoading(false);
        return;
      }
      
      if (imageCache.has(imageId)) {
        setImageUrl(imageCache.get(imageId)!);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // FIX: This call is now valid as getImageBlob is a method on the db instance.
        const imageRecord = await db.getImageBlob(imageId);
        if (isMounted && imageRecord) {
          objectUrl = URL.createObjectURL(imageRecord.blob);
          imageCache.set(imageId, objectUrl);
          setImageUrl(objectUrl);
        } else if (isMounted && fallbackUrl) {
           // In a real app, you would fetch from fallbackUrl, cache in IndexedDB, and then set the URL.
           // For this example, we'll just use the fallback directly.
           setImageUrl(fallbackUrl);
        }
      } catch (error) {
        console.error("Failed to load image from IndexedDB", error);
        if(isMounted && fallbackUrl) setImageUrl(fallbackUrl);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
         // This is tricky because other components might be using the same blob URL.
         // A more robust solution might use a ref counting system for cache eviction.
         // For now, we will not revoke it immediately to avoid breaking other views.
         // URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId, fallbackUrl]);

  return { imageUrl, loading };
};
