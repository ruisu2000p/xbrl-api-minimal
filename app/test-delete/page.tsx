export default function TestDeletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Test Delete Page</h1>
        <p>This is a test page to verify routing works.</p>
        <a href="/account/delete" className="text-blue-600 hover:underline">
          Go to Account Delete Page
        </a>
      </div>
    </div>
  );
}