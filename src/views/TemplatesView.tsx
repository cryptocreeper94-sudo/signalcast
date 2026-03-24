import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

const TENANT_ID = 'direct';

interface Template {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  platform: string;
  content: string;
  shortContent?: string;
  imagePrompt?: string;
  hashtagSets: string[];
  variables: { name: string; description: string; defaultValue: string }[];
  usageCount: number;
  isActive: boolean;
}

const CATEGORIES = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'retail', label: 'Retail', icon: '🛍️' },
  { value: 'realestate', label: 'Real Estate', icon: '🏠' },
  { value: 'saas', label: 'SaaS / Tech', icon: '💻' },
  { value: 'health', label: 'Health & Fitness', icon: '💪' },
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'general', label: 'General', icon: '📢' },
];

const BUILTIN_TEMPLATES: Omit<Template, 'id' | 'usageCount' | 'isActive'>[] = [
  // Restaurant
  { tenantId: 'shared', name: 'Daily Special', category: 'restaurant', platform: 'all',
    content: '🍽️ Today\'s Special at {business_name}!\n\n{special_description}\n\nAvailable today only — don\'t miss out!\n📍 {location}\n📞 {phone}\n\n#DailySpecial #FoodLovers #{city}Eats',
    shortContent: '🍽️ Today\'s Special: {special_description} at {business_name}! Available today only 🔥 #{city}Eats',
    variables: [{ name: 'business_name', description: 'Your restaurant name', defaultValue: 'Our Restaurant' }, { name: 'special_description', description: 'What\'s the special?', defaultValue: 'Chef\'s signature pasta with garlic bread' }, { name: 'location', description: 'Address', defaultValue: '123 Main St' }, { name: 'phone', description: 'Phone number', defaultValue: '(555) 123-4567' }, { name: 'city', description: 'City name', defaultValue: 'Austin' }],
    hashtagSets: ['#FoodLovers', '#DailySpecial', '#LocalEats', '#FoodieLife'], imagePrompt: '' },
  { tenantId: 'shared', name: 'Happy Hour Promo', category: 'restaurant', platform: 'all',
    content: '🍻 Happy Hour at {business_name}!\n\n{happy_hour_details}\n\n⏰ {time_window}\n🎵 {vibe}\n\nTag someone who deserves a drink! 🥂\n\n#HappyHour #{city}Nightlife #Cheers',
    shortContent: '🍻 Happy Hour! {happy_hour_details} at {business_name} ⏰ {time_window} #HappyHour',
    variables: [{ name: 'business_name', description: 'Restaurant name', defaultValue: '' }, { name: 'happy_hour_details', description: 'Deals / specials', defaultValue: '$5 margaritas, $3 tacos' }, { name: 'time_window', description: 'Hours', defaultValue: '4pm - 7pm' }, { name: 'vibe', description: 'Atmosphere/music', defaultValue: 'Live jazz on the patio' }, { name: 'city', description: 'City', defaultValue: '' }],
    hashtagSets: ['#HappyHour', '#DrinkSpecials', '#NightOut'], imagePrompt: '' },
  // Retail
  { tenantId: 'shared', name: 'Flash Sale', category: 'retail', platform: 'all',
    content: '⚡ FLASH SALE ⚡\n\n{sale_details}\n\n🔥 {discount} OFF — {duration} only!\n\n🛒 Shop now: {link}\n\nDon\'t wait — this won\'t last!\n\n#FlashSale #ShopNow #{brand}',
    shortContent: '⚡ FLASH SALE: {discount} OFF! {sale_details} 🛒 {link} #FlashSale',
    variables: [{ name: 'sale_details', description: 'What\'s on sale', defaultValue: 'All summer collection' }, { name: 'discount', description: 'Discount %', defaultValue: '40%' }, { name: 'duration', description: 'How long', defaultValue: '24 hours' }, { name: 'link', description: 'Shop URL', defaultValue: '' }, { name: 'brand', description: 'Brand name', defaultValue: '' }],
    hashtagSets: ['#FlashSale', '#ShopNow', '#Deals'], imagePrompt: '' },
  { tenantId: 'shared', name: 'New Arrival', category: 'retail', platform: 'all',
    content: '✨ NEW ARRIVAL ✨\n\n{product_name} is here!\n\n{product_description}\n\n💰 ${price}\n🛒 Shop: {link}\n\n#NewArrival #JustDropped #{brand}',
    shortContent: '✨ NEW: {product_name} just dropped! ${price} 🛒 {link} #NewArrival',
    variables: [{ name: 'product_name', description: 'Product name', defaultValue: '' }, { name: 'product_description', description: 'Description', defaultValue: '' }, { name: 'price', description: 'Price', defaultValue: '49.99' }, { name: 'link', description: 'Product URL', defaultValue: '' }, { name: 'brand', description: 'Brand', defaultValue: '' }],
    hashtagSets: ['#NewArrival', '#JustDropped', '#Shopping'], imagePrompt: '' },
  // Real Estate
  { tenantId: 'shared', name: 'New Listing', category: 'realestate', platform: 'all',
    content: '🏡 JUST LISTED!\n\n{property_address}\n\n{property_details}\n\n💰 ${price}\n🛏️ {beds} Bed | 🛁 {baths} Bath | 📐 {sqft} sqft\n\nSchedule a showing today!\n📞 {agent_phone}\n\n#JustListed #RealEstate #{city}Homes',
    shortContent: '🏡 NEW: {property_address} — {beds}bd/{baths}ba, {sqft}sf, ${price}. Call {agent_phone} #JustListed',
    variables: [{ name: 'property_address', description: 'Address', defaultValue: '' }, { name: 'property_details', description: 'Key features', defaultValue: 'Beautiful recently updated home with modern kitchen' }, { name: 'price', description: 'Price', defaultValue: '350,000' }, { name: 'beds', description: 'Bedrooms', defaultValue: '3' }, { name: 'baths', description: 'Bathrooms', defaultValue: '2' }, { name: 'sqft', description: 'Sq ft', defaultValue: '1,800' }, { name: 'agent_phone', description: 'Agent phone', defaultValue: '' }, { name: 'city', description: 'City', defaultValue: '' }],
    hashtagSets: ['#JustListed', '#RealEstate', '#HomesForSale', '#DreamHome'], imagePrompt: '' },
  // SaaS
  { tenantId: 'shared', name: 'Feature Launch', category: 'saas', platform: 'all',
    content: '🚀 NEW FEATURE: {feature_name}\n\n{feature_description}\n\n{key_benefits}\n\nTry it now → {link}\n\n#ProductUpdate #{product_name} #SaaS',
    shortContent: '🚀 NEW: {feature_name}! {feature_description} Try it → {link} #{product_name}',
    variables: [{ name: 'feature_name', description: 'Feature name', defaultValue: '' }, { name: 'feature_description', description: 'What it does', defaultValue: '' }, { name: 'key_benefits', description: 'Benefits', defaultValue: '✓ Saves time\n✓ Boosts productivity\n✓ Easy to use' }, { name: 'link', description: 'Product URL', defaultValue: '' }, { name: 'product_name', description: 'Product', defaultValue: '' }],
    hashtagSets: ['#ProductLaunch', '#SaaS', '#Innovation'], imagePrompt: '' },
  // Health
  { tenantId: 'shared', name: 'Workout Tip', category: 'health', platform: 'all',
    content: '💪 FITNESS TIP OF THE DAY\n\n{tip_title}\n\n{tip_content}\n\n{call_to_action}\n\n📍 {gym_name}\n🔗 {link}\n\n#FitnessTip #HealthyLiving #{city}Fitness',
    shortContent: '💪 {tip_title}: {tip_content} #{city}Fitness #WorkoutTip',
    variables: [{ name: 'tip_title', description: 'Tip headline', defaultValue: 'Core Strength Basics' }, { name: 'tip_content', description: 'The tip', defaultValue: 'Planks are the foundation of core stability. Start with 30-second holds and work up to 2 minutes.' }, { name: 'call_to_action', description: 'CTA', defaultValue: 'Book a free personal training session!' }, { name: 'gym_name', description: 'Gym/studio name', defaultValue: '' }, { name: 'link', description: 'Website', defaultValue: '' }, { name: 'city', description: 'City', defaultValue: '' }],
    hashtagSets: ['#FitnessTip', '#HealthyLiving', '#Workout'], imagePrompt: '' },
  // General
  { tenantId: 'shared', name: 'Motivational Quote', category: 'general', platform: 'all',
    content: '💡 "{quote}"\n\n— {author}\n\n{reflection}\n\n#Motivation #Inspiration #MindsetMatters',
    shortContent: '💡 "{quote}" — {author} #Motivation',
    variables: [{ name: 'quote', description: 'The quote', defaultValue: 'The only way to do great work is to love what you do.' }, { name: 'author', description: 'Author', defaultValue: 'Steve Jobs' }, { name: 'reflection', description: 'Your thoughts', defaultValue: 'Start this week with purpose. What\'s one thing you can do today to move closer to your goals?' }],
    hashtagSets: ['#Motivation', '#Inspiration', '#MindsetMatters'], imagePrompt: '' },
  { tenantId: 'shared', name: 'Behind the Scenes', category: 'general', platform: 'all',
    content: '👀 BEHIND THE SCENES\n\n{bts_content}\n\n{company_message}\n\nFollow us for more insider looks! 🎬\n\n#BehindTheScenes #BTS #{brand}',
    shortContent: '👀 BTS: {bts_content} #BehindTheScenes #{brand}',
    variables: [{ name: 'bts_content', description: 'What you\'re showing', defaultValue: 'Take a peek at our team prepping for next week\'s big launch!' }, { name: 'company_message', description: 'Brand message', defaultValue: 'We believe in transparency — that\'s why we share the process, not just the product.' }, { name: 'brand', description: 'Brand name', defaultValue: '' }],
    hashtagSets: ['#BehindTheScenes', '#BTS', '#Authentic'], imagePrompt: '' },
  { tenantId: 'shared', name: 'Client Testimonial', category: 'professional', platform: 'all',
    content: '⭐ CLIENT SPOTLIGHT\n\n"{testimonial}"\n\n— {client_name}, {client_title}\n\n{follow_up}\n\n🔗 {link}\n\n#ClientSuccess #Testimonial #{brand}',
    shortContent: '⭐ "{testimonial}" — {client_name} #ClientSuccess #{brand}',
    variables: [{ name: 'testimonial', description: 'Client quote', defaultValue: '' }, { name: 'client_name', description: 'Client name', defaultValue: '' }, { name: 'client_title', description: 'Title/company', defaultValue: '' }, { name: 'follow_up', description: 'Your message', defaultValue: 'Ready to achieve similar results? Let\'s talk!' }, { name: 'link', description: 'Your URL', defaultValue: '' }, { name: 'brand', description: 'Your brand', defaultValue: '' }],
    hashtagSets: ['#ClientSuccess', '#Testimonial', '#Results'], imagePrompt: '' },
];

export default function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState('all');
  const [preview, setPreview] = useState<string | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetch(`/api/templates?tenantId=${TENANT_ID}`).then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const allTemplates = templates.length > 0 ? templates : (BUILTIN_TEMPLATES as any) as Template[];
  const filtered = category === 'all' ? allTemplates : allTemplates.filter(t => t.category === category);

  const fillTemplate = (content: string) => {
    let filled = content;
    Object.entries(varValues).forEach(([key, val]) => {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), val || `{${key}}`);
    });
    return filled;
  };

  const deployTemplate = async (template: any) => {
    const content = fillTemplate(template.shortContent || template.content);
    setDeploying(true);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      const total = Object.keys(data.results || {}).length;
      const success = Object.values(data.results || {}).filter((r: any) => r.success).length;
      alert(`✓ Broadcast: ${success}/${total} platforms succeeded`);
    } catch (err) {
      alert(`✗ Error: ${err}`);
    }
    setDeploying(false);
  };

  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Content Templates</h1>
            <p className="view-subtitle">{filtered.length} templates available</p>
          </div>
          <InfoBubble
            title="Content Templates"
            content={<>
              <p>Templates are <strong>reusable post formats</strong> with fill-in-the-blank variables that make creating consistent, professional content effortless.</p>
              <p><strong>How to use:</strong></p>
              <ol>
                <li>Browse templates by category (Restaurant, Retail, SaaS, etc.)</li>
                <li>Click a template to preview it and fill in the variables</li>
                <li>Click "Broadcast" to send the filled template to all connected platforms</li>
              </ol>
              <p>Each template has a <strong>short version</strong> optimized for X/Twitter's 280-char limit and a <strong>long version</strong> for Facebook, LinkedIn, etc.</p>
              <p>Templates use <code>{'{'}variable_name{'}'}</code> syntax — fill in your specifics and they auto-populate.</p>
            </>}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-8 mb-24" style={{ flexWrap: 'wrap', overflowX: 'auto' }}>
        {CATEGORIES.map(c => (
          <button key={c.value} className={`toggle-chip ${category === c.value ? 'selected' : ''}`} onClick={() => setCategory(c.value)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="bento-grid bento-3">
        {filtered.map((t, i) => {
          const isPreview = preview === (t.id || t.name);
          return (
            <div
              key={t.id || t.name}
              className={`glass-panel interactive animate-in ${isPreview ? 'selected' : ''}`}
              style={{ animationDelay: `${i * 0.03}s`, cursor: 'pointer', borderColor: isPreview ? 'var(--accent-border)' : undefined }}
              onClick={() => {
                setPreview(isPreview ? null : (t.id || t.name));
                if (!isPreview && t.variables) {
                  const defaults: Record<string, string> = {};
                  (t.variables as any[])?.forEach((v: any) => { defaults[v.name] = v.defaultValue || ''; });
                  setVarValues(defaults);
                }
              }}
            >
              <div style={{ padding: 16 }}>
                <div className="flex items-center gap-8 mb-8">
                  <span className="text-xs" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    {CATEGORIES.find(c => c.value === t.category)?.icon} {t.category}
                  </span>
                  {t.platform !== 'all' && <span className="text-xs text-muted">{t.platform}</span>}
                </div>
                <h4 className="text-sm font-bold mb-4">{t.name}</h4>
                <p className="text-xs text-muted" style={{ lineHeight: 1.5, maxHeight: isPreview ? 'none' : 60, overflow: 'hidden' }}>
                  {isPreview ? fillTemplate(t.content) : t.content.slice(0, 120) + (t.content.length > 120 ? '...' : '')}
                </p>

                {isPreview && t.variables && (t.variables as any[]).length > 0 && (
                  <div className="mt-16 animate-in" style={{ borderTop: '1px solid var(--void-border)', paddingTop: 16 }}>
                    <p className="text-xs font-bold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)' }}>Fill Variables</p>
                    {(t.variables as any[]).map((v: any) => (
                      <div key={v.name} className="mb-8">
                        <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 2 }}>{v.description || v.name}</label>
                        <input
                          className="composer-textarea"
                          style={{ minHeight: 32, fontSize: '0.75rem' }}
                          value={varValues[v.name] || ''}
                          onChange={e => setVarValues(prev => ({...prev, [v.name]: e.target.value}))}
                          placeholder={v.name}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    ))}
                    <div className="flex gap-8 mt-12">
                      <button className="btn btn-primary" onClick={e => { e.stopPropagation(); deployTemplate(t); }} disabled={deploying} style={{ fontSize: '0.75rem' }}>
                        {deploying ? 'Sending...' : '📡 Broadcast Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
