import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithProvider } from "@/app/(auth)/_actions";

export function OAuthButtons({ next = "/dashboard" }: { next?: string }) {
  return (
    <div className="grid gap-2">
      <form action={signInWithProvider}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon /> Continue with Google
        </Button>
      </form>
      <form action={signInWithProvider}>
        <input type="hidden" name="provider" value="github" />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="w-full">
          <Github className="h-4 w-4" /> Continue with GitHub
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6L12 10.2z"
      />
    </svg>
  );
}
