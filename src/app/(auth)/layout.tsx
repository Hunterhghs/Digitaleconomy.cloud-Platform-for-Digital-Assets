import { SiteLogo } from "@/components/site-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex min-h-[calc(100vh-12rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <SiteLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
