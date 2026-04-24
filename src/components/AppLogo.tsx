import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AppLogo({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'logo'), (doc) => {
      if (doc.exists()) {
        setLogoUrl(doc.data().url);
      }
    });
    return unsub;
  }, []);

  if (!logoUrl) {
    return <div {...(props as any)} className={`bg-blue-600 rounded-full flex items-center justify-center ${className || ''}`} style={{display: 'flex'}}>
      <span className="text-white font-bold text-xs">ORBE</span>
    </div>;
  }

  return <img src={logoUrl} alt="Logo" className={className} {...props} />;
}
