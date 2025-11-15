import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <Button
      onClick={() => signOut()}
      variant="ghost"
      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
    >
      <span className="mr-1">Logout</span> <LogOut className="w-4 h-4" />
    </Button>
  );
}
