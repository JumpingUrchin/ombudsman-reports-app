import { redirect } from 'next/navigation';

// Root page redirects to locale-specific route
// The middleware will handle the actual redirection based on user's language preference
export default function RootPage() {
  // This should not be reached due to middleware, but provide fallback
  redirect('/zh-HK');
}
