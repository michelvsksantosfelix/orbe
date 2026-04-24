import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface Props {
  className?: string;
}

export default function Logo({ className = "w-16 h-16 rounded-full" }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "branding"), (doc) => {
      if (doc.exists()) {
        setLogoUrl(doc.data().logoUrl);
      }
    });
    return () => unsub();
  }, []);

  return (
    <img 
      src={logoUrl || '/logo.svg'} 
      alt="Orbe Piscinas" 
      className={className} 
      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 500 500%22><circle cx=%22250%22 cy=%22250%22 r=%22250%22 fill=%22%232563eb%22/></svg>'; }} 
    />
  );
}
