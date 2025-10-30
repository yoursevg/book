import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLogoutMutation, useMeQuery } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";

export default function UserMenu() {
  const { data: me } = useMeQuery();
  const logout = useLogoutMutation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  if (!me) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowLogin(true)}>Login</Button>
          <Button size="sm" onClick={() => setShowRegister(true)}>Register</Button>
        </div>
        <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
        <RegisterDialog open={showRegister} onOpenChange={setShowRegister} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">{me.username}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{me.username}</span>
            {me.email && <span className="text-xs text-muted-foreground">{me.email}</span>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout.mutate()}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
