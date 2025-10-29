import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
    name: string;
    imageUrl?: string;
    size?: "sm" | "md" | "lg";
}

export default function UserAvatar({ name, imageUrl, size = "md" }: UserAvatarProps) {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-12 h-12 text-base"
    };

    return (
        <Avatar className={sizeClasses[size]} data-testid={`avatar-${name.toLowerCase().replace(/\s+/g, '-')}`}>
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}