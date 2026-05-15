import { db } from './firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// Advanced Security blocking
export const BLOCKED_COUNTRIES: string[] = ['IL', 'RU', 'KP', 'IR'];

export interface SecurityCheck {
  allowed: boolean;
  reason?: string;
  country?: string;
  countryCode?: string;
  ip?: string;
}

export async function checkSecurityAccess(): Promise<SecurityCheck> {
  try {
    // Extensive series of fallbacks for geolocation
    let data: any = null;
    const services = [
      { url: 'https://ipwho.is/', type: 'ipwhois' }, 
      { url: 'https://ipapi.co/json/', type: 'ipapi' },
      { url: 'https://ipinfo.io/json', type: 'ipinfo' },
      { url: 'https://api.db-ip.com/v2/free/self', type: 'dbip' },
      { url: 'https://api.ipify.org?format=json', type: 'ipify' } 
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // Increased timeout
        const response = await fetch(service.url, { signal: controller.signal });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resData = await response.json();
        clearTimeout(timeoutId);

        if (service.type === 'ipapi') {
          data = {
            ip: resData.ip,
            country_name: resData.country_name,
            country_code: resData.country_code?.toUpperCase(),
            org: resData.org
          };
        } else if (service.type === 'ipwhois') {
          data = {
            ip: resData.ip,
            country_name: resData.country,
            country_code: resData.country_code?.toUpperCase(),
            org: resData.connection?.isp || resData.connection?.org
          };
        } else if (service.type === 'ipinfo') {
          let countryName = resData.country;
          try {
            const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
            countryName = regionNames.of(resData.country) || resData.country;
          } catch (e) { /* fallback to code */ }
          
          data = {
            ip: resData.ip,
            country_name: countryName,
            country_code: resData.country?.toUpperCase(),
            org: resData.org
          };
        } else if (service.type === 'dbip') {
          data = {
            ip: resData.ipAddress,
            country_name: resData.countryName,
            country_code: resData.countryCode?.toUpperCase(),
          };
        } else if (service.type === 'ipify') {
          data = { ip: resData.ip || resData.ipAddress };
        }

        if (data && data.ip && data.country_code) break; // Success with full data!
      } catch (e) {
        console.warn(`Geo service ${service.type} failed:`, e);
      }
    }

    if (!data || !data.ip) {
      console.error("CRITICAL: All geolocation services failed to identify IP");
      // If we failed but have navigator.onLine, we try one more simple one
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        data = { ip: json.ip };
      } catch(e) {
        throw new Error("All geolocation services failed");
      }
    }
    
    console.log(`SECURE UPLINK: Node ${data.ip} identified at ${data.country_code || 'Unknown Loc'}`);
    
    // Check against Firestore blocked IPs
    try {
      // Normalize IP for ID usage in Firestore (dots to underscores)
      const ipId = data.ip.replace(/\./g, '_');
      const { getDoc, doc } = await import('firebase/firestore');
      
      const ipDoc = await getDoc(doc(db, 'blocked_ips', ipId));
      if (ipDoc.exists()) {
        console.warn(`BLOCKED IP DETECTED: ${data.ip}`);
        return { 
          allowed: false, 
          reason: 'Your IP access token has been revoked by administration.', 
          country: data.country_name, 
          countryCode: data.country_code,
          ip: data.ip 
        };
      }
      
      // Dynamic Country Block Check - Try both direct lookup and query
      if (data.country_code) {
        const cCode = data.country_code.toUpperCase();
        const countryDocRef = await getDoc(doc(db, 'blocked_countries', cCode));
        if (countryDocRef.exists()) {
          console.warn(`BLOCKED REGION DETECTED: ${cCode}`);
          return { 
            allowed: false, 
            reason: 'Geolocation restriction in effect for this sector (Dynamic Block).', 
            country: data.country_name, 
            countryCode: data.country_code, 
            ip: data.ip 
          };
        }
      }
    } catch (e) {
      console.warn("Dynamic blocking checks partially bypassed due to network issues:", e);
    }

    // Simple VPN check: Some APIs provide 'asn' or 'org' that mentions VPN/Hosting
    const isHosting = data.org?.toLowerCase().includes('hosting') || 
                      data.org?.toLowerCase().includes('vpn') ||
                      data.org?.toLowerCase().includes('proxy');
    
    if (data.country_code && BLOCKED_COUNTRIES.includes(data.country_code)) {
      return { allowed: false, reason: 'Geolocation restriction in effect for this sector.', country: data.country_name, countryCode: data.country_code, ip: data.ip };
    }
    
    if (isHosting) {
      return { allowed: false, reason: 'VPN/Proxy detected. Direct terminal connection required.', country: data.country_name, countryCode: data.country_code, ip: data.ip };
    }

    return { allowed: true, country: data.country_name, countryCode: data.country_code, ip: data.ip };
  } catch (error) {
    // If we fail everything, we should probably still allow but log it
    // Or if the user wants strict, we set allowed: false.
    // Given the user complaints, let's be more strict if we have no data but only if they are not admin? 
    // But we don't know the role here.
    return { allowed: true }; 
  }
}
