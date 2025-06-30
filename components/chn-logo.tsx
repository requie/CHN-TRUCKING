import { Truck } from "lucide-react"

interface CHNLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

export function CHNLogo({ size = "md", showText = true, className = "" }: CHNLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Modern truck icon with gradient background */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg`}
        >
          <Truck className={`${size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-6 w-6"} text-white`} />
        </div>
        {/* Accent dot */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-900 leading-tight ${textSizeClasses[size]}`}>CHN</span>
          {size !== "sm" && (
            <span className={`text-gray-600 font-medium ${size === "lg" ? "text-lg" : "text-sm"} -mt-1`}>
              Trucking Portal
            </span>
          )}
        </div>
      )}
    </div>
  )
}
