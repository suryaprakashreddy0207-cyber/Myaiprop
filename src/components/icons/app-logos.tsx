import React from "react";

/** Latest Official Google Drive Logo (Full 5-color rounded triangle) */
export function GoogleDriveLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}

/** Latest Official Google Sheets Logo */
export function GoogleSheetsLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M58 88H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6h36l22 22v60a6 6 0 0 1-6 6z"
        fill="#0F9D58"
      />
      <path d="M42 0l22 22H42V0z" fill="#87CEAC" />
      <path
        d="M12 42v28h40V42H12zm18 23H17v-7h13v7zm0-12H17v-6h13v6zm17 12H34v-7h13v7zm0-12H34v-6h13v6z"
        fill="#F1F1F1"
      />
    </svg>
  );
}

/** Latest Official Gmail Logo (5-Color Google Workspace M Icon) */
export function GmailLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285f4"
        d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"
      />
      <path
        fill="#34a853"
        d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"
      />
      <path
        fill="#fbbc04"
        d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"
      />
      <path
        fill="#ea4335"
        d="M72 74V48l24 18 24-18v26L96 92"
      />
      <path
        fill="#c5221f"
        d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"
      />
    </svg>
  );
}

/** Official WhatsApp Logo */
export function WhatsAppLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#25D366"
        d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z"
      />
      <path
        fill="#FFFFFF"
        d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z M33.249,29.506c-0.39,1.101-1.953,2.015-3.185,2.276c-0.848,0.18-1.956,0.323-5.689-1.224c-4.782-1.981-7.861-6.836-8.099-7.154c-0.23-0.317-1.932-2.571-1.932-4.904c0-2.333,1.222-3.479,1.656-3.954c0.434-0.476,0.949-0.595,1.266-0.595c0.316,0,0.633,0.003,0.91,0.017c0.292,0.015,0.684-0.111,1.07,0.816c0.39,0.952,1.339,3.293,1.458,3.531c0.119,0.238,0.198,0.516,0.039,0.833c-0.158,0.317-0.238,0.516-0.475,0.794c-0.238,0.278-0.5,0.621-0.713,0.833c-0.238,0.238-0.486,0.495-0.209,0.971c0.277,0.476,1.232,2.032,2.645,3.292c1.817,1.621,3.349,2.123,3.824,2.361c0.475,0.238,0.752,0.198,1.03-0.119c0.277-0.317,1.188-1.389,1.505-1.865c0.317-0.476,0.633-0.397,1.069-0.238c0.436,0.159,2.772,1.309,3.247,1.547c0.475,0.238,0.792,0.357,0.911,0.555C33.639,27.491,33.639,28.405,33.249,29.506z"
      />
    </svg>
  );
}

/** Official Slack Logo */
export function SlackLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 122.8 122.8" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
        fill="#e01e5a"
      />
      <path
        d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
        fill="#36c5f0"
      />
      <path
        d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
        fill="#2eb67d"
      />
      <path
        d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
        fill="#ecb22e"
      />
    </svg>
  );
}

/** Latest Official Google Maps Logo (Official 4-Color Pin) */
export function GoogleMapsLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      {/* Top red arch */}
      <path
        d="M100 0C44.8 0 0 44.8 0 100c0 28.5 12 54.2 31.3 72.3L100 300l68.7-127.7C188 154.2 200 128.5 200 100 200 44.8 155.2 0 100 0z"
        fill="#EA4335"
      />
      {/* Blue right accent */}
      <path
        d="M100 0c26.5 0 50.6 10.3 68.6 27.1L135 60.7C125 52.8 113 48 100 48c-28.7 0-52 23.3-52 52 0 12.8 4.7 24.6 12.4 33.7l-34.1 34.1C10.1 149.8 0 126.1 0 100 0 44.8 44.8 0 100 0z"
        fill="#4285F4"
      />
      {/* Green bottom curve */}
      <path
        d="M100 300l-68.7-127.7C24.3 165.6 19.3 157.3 15 148l45.4-26.2c3.5 6.2 8.3 11.6 14.1 15.6L100 300z"
        fill="#34A853"
      />
      {/* Yellow inner segment */}
      <path
        d="M100 48c28.7 0 52 23.3 52 52 0 13.5-5.2 25.8-13.6 35l30.3 30.3c19.3-20.2 31.3-47.5 31.3-77.3 0-55.2-44.8-100-100-100v60z"
        fill="#FBBC04"
      />
      {/* White center circle */}
      <circle cx="100" cy="100" r="38" fill="#FFFFFF" />
      {/* Red inner pin center */}
      <circle cx="100" cy="100" r="22" fill="#D93025" />
    </svg>
  );
}

/** Official GitHub Octocat Logo */
export function GitHubLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.36 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Official Stripe Logo */
export function StripeLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#635BFF" />
      <path
        d="M19.4 15.6c0-1.4 1.2-2.2 3.1-2.2 2.6 0 5.2.9 7 1.9V9.6c-2.1-.9-4.7-1.4-7-1.4-6.2 0-10.4 3.2-10.4 8.7 0 8.4 11.5 7.1 11.5 10.7 0 1.7-1.5 2.3-3.6 2.3-3.1 0-6.1-1.3-8.2-2.5v5.8c2.4 1.1 5.3 1.7 8.2 1.7 6.4 0 10.9-3.2 10.9-8.9 0-9.1-11.5-7.4-11.5-10.8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official Supabase Logo */
export function SupabaseLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M65.4 112.5C62.7 114.7 58.7 113 58.4 109.5L53.7 54.3H102.8C107.5 54.3 109.9 59.9 106.6 63.3L65.4 112.5Z"
        fill="#3ECF8E"
      />
      <path
        d="M43.7 0.5C46.3 -1.7 50.3 0 50.7 3.5L55.4 58.7H6.2C1.5 58.7 -0.9 53.1 2.4 49.7L43.7 0.5Z"
        fill="#249361"
      />
    </svg>
  );
}

/** Official Firebase Logo */
export function FirebaseLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 116 160" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21.2 92.5L2.3 131.7C-1 138.5 4.3 146 11.9 144.5L58.1 135.8 21.2 92.5z"
        fill="#FFC400"
      />
      <path
        d="M62.6 44.9l-18.7-35.4c-3.1-5.9-11.7-4.7-13.1 1.8L.8 132.8l20.4-40.3 41.4-47.6z"
        fill="#FF9100"
      />
      <path
        d="M58.1 135.8L11.9 144.5c-7.6 1.4-12.9-6.1-9.6-12.8L21.2 92.5l36.9 43.3z"
        fill="#FFC400"
      />
      <path
        d="M115.1 132.8L93.7 19.3c-1.1-6.2-9.2-8.3-13.2-3.4L.8 132.8l57.3 32.1c5.2 2.9 11.6 2.9 16.8 0l40.2-22.1z"
        fill="#DD2C00"
      />
    </svg>
  );
}

/** Official OpenAI Swirl / Flower Logo */
export function OpenAILogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 8.737a4.485 4.485 0 0 1 2.37-2.002l-.004.162v5.523a.798.798 0 0 0 .392.682l5.839 3.37-2.02 1.168a.076.076 0 0 1-.067 0L4.01 14.802A4.498 4.498 0 0 1 2.34 8.737zm16.598 2.663-5.843-3.37 2.02-1.168a.076.076 0 0 1 .067 0l4.84 2.838a4.5 4.5 0 0 1-.687 7.747v-5.367a.798.798 0 0 0-.397-.68zM20.499 5.8a4.48 4.48 0 0 1 .535 3.014l-.142-.085-4.783-2.759a.771.771 0 0 0-.78 0L9.486 9.34V7.008a.08.08 0 0 1 .033-.062L14.36 4.15a4.5 4.5 0 0 1 6.14 1.646zM8.37 13.064l2.838-1.64 2.842 1.64v3.279l-2.842 1.64-2.838-1.64z" />
    </svg>
  );
}

/** Official Shopify Logo */
export function ShopifyLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 109 123" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M93.8 22.3c-.5-.4-1.2-.4-1.7-.1l-7.7 4.2c-.4.2-.9.1-1.2-.2L74.8 13c-.9-1.2-2.5-1.6-3.8-1-1.3.6-2 2-1.7 3.4l2.4 12.3c.1.5-.1 1-.5 1.3L48.1 41.5c-.8.5-1.9.4-2.5-.4l-7.4-9.8c-.8-1.1-2.3-1.4-3.5-.8-1.2.6-1.8 2-1.5 3.3l6.5 28.5c.2.8.8 1.4 1.6 1.5l45.4 6.8c.8.1 1.6-.4 1.8-1.2l9.7-44.5c.2-1.1-.3-2.1-1.4-2.6z"
        fill="#95BF47"
      />
      <path
        d="M62.3 0c-1.3 0-2.6.4-3.7 1.1L35.8 14.5c-3.1 1.8-5.1 5.2-5.1 8.8v64.6c0 3.6 2 7 5.1 8.8l22.8 13.4c2.3 1.3 5.1 1.3 7.4 0l22.8-13.4c3.1-1.8 5.1-5.2 5.1-8.8V23.3c0-3.6-2-7-5.1-8.8L66 1.1C64.9.4 63.6 0 62.3 0z"
        fill="#5E8E3E"
      />
    </svg>
  );
}

/** Official Notion Logo */
export function NotionLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="#000000" />
      <path
        d="M22 28v44h12V46.5L59 72h19V28H66v25.5L41 28H22z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official Twilio Logo */
export function TwilioLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="30" fill="#F22F46" />
      <circle cx="20" cy="20" r="6" fill="#FFFFFF" />
      <circle cx="40" cy="20" r="6" fill="#FFFFFF" />
      <circle cx="20" cy="40" r="6" fill="#FFFFFF" />
      <circle cx="40" cy="40" r="6" fill="#FFFFFF" />
    </svg>
  );
}

/** Official Google Analytics 4 (GA4) Logo */
export function GoogleAnalyticsLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 19.5h-3a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 24 6v12a1.5 1.5 0 0 1-1.5 1.5z" fill="#F9AB00" />
      <path d="M13.5 19.5h-3a1.5 1.5 0 0 1-1.5-1.5V10.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5z" fill="#E37400" />
      <circle cx="3" cy="16.5" r="3" fill="#E37400" />
    </svg>
  );
}

/** Official PostHog Analytics Logo */
export function PostHogLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#F54E00" />
      <path d="M7 16a9 9 0 0 1 18 0v4a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5v-4z" fill="#FFFFFF" />
      <circle cx="12" cy="15" r="1.5" fill="#1D1F27" />
      <circle cx="20" cy="15" r="1.5" fill="#1D1F27" />
      <path d="M14 18h4" stroke="#1D1F27" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Official Mixpanel Analytics Logo */
export function MixpanelLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#7856FF" />
      <circle cx="7" cy="12" r="2.5" fill="#FFFFFF" />
      <circle cx="12" cy="8" r="2.5" fill="#FFFFFF" />
      <circle cx="17" cy="15" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}


