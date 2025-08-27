export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            XBRL Financial Data API
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Access Japanese corporate financial data through our API
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://xbrl-api-minimal.vercel.app/docs"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              API Documentation
            </a>
            <a
              href="/dashboard"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}