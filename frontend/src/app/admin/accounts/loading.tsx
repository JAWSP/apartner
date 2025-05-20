import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AdminAccountsLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
            <Skeleton className="h-10 w-full md:w-96" />
          </div>

          <div className="rounded-md border">
            <div className="h-10 px-4 border-b flex items-center">
              <Skeleton className="h-4 w-16 mr-8" />
              <Skeleton className="h-4 w-32 mr-8" />
              <Skeleton className="h-4 w-20 mr-8" />
              <Skeleton className="h-4 w-24 mr-8" />
              <Skeleton className="h-4 w-16 mr-8" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="divide-y">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-16 px-4 flex items-center">
                    <Skeleton className="h-4 w-32 mr-8" />
                    <Skeleton className="h-4 w-48 mr-8" />
                    <Skeleton className="h-4 w-24 mr-8" />
                    <Skeleton className="h-4 w-32 mr-8" />
                    <Skeleton className="h-4 w-20 mr-8" />
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
