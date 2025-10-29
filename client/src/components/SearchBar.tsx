import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Search in document..." }: SearchBarProps) {
    const [query, setQuery] = useState("");

    const handleSearch = (value: string) => {
        setQuery(value);
        onSearch?.(value);
        console.log("Searching for:", value);
    };

    const clearSearch = () => {
        setQuery("");
        onSearch?.("");
        console.log("Search cleared");
    };

    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
                data-testid="input-search"
            />
            {query && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6"
                    data-testid="button-clear-search"
                >
                    <X className="w-3 h-3" />
                </Button>
            )}
        </div>
    );
}