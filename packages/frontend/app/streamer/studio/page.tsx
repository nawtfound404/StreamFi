import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function StudioPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b">
          <Avatar className="h-10 w-10" />
          <div>
            <div className="font-bold">Streamer Studio</div>
            <Badge variant="secondary">Live</Badge>
          </div>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li><Button variant="ghost" className="w-full justify-start">Dashboard</Button></li>
            <li><Button variant="ghost" className="w-full justify-start">Stream Controls</Button></li>
            <li><Button variant="ghost" className="w-full justify-start">Overlays</Button></li>
            <li><Button variant="ghost" className="w-full justify-start">Chat</Button></li>
            <li><Button variant="ghost" className="w-full justify-start">Analytics</Button></li>
            <li><Button variant="ghost" className="w-full justify-start">Settings</Button></li>
          </ul>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6 justify-between bg-card">
          <div className="font-semibold text-lg">Studio</div>
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Stream Info</Button>
              </SheetTrigger>
              <SheetContent side="right">
                <h2 className="font-bold text-xl mb-4">Stream Details</h2>
                <Separator className="mb-4" />
                <div className="space-y-4">
                  <Input placeholder="Stream title" />
                  <Textarea placeholder="Description" />
                  <div className="flex items-center gap-2">
                    <Switch id="public-switch" />
                    <label htmlFor="public-switch" className="text-sm">Public</label>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Avatar className="h-8 w-8" />
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="controls" className="w-full">
            <TabsList>
              <TabsTrigger value="controls">Stream Controls</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="overlays">Overlays</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="controls">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Button>Start Stream</Button>
                    <Button variant="destructive">Stop Stream</Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">Show Stream Key</Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Input value="sk_live_xxxxx" readOnly />
                        <Button size="sm" className="mt-2 w-full">Copy</Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Progress value={70} className="mt-6" />
                  <Alert className="mt-4">Stream is offline. Click start to go live.</Alert>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preview">
              <Card>
                <CardContent className="p-6">
                  <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground rounded-lg">
                    {/* HLS.js video preview will go here */}
                    <span>Stream preview (HLS)</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="overlays">
              <Card>
                <CardContent className="p-6">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Overlay 1</AccordionTrigger>
                      <AccordionContent>Overlay settings...</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="chat">
              <Card>
                <CardContent className="p-6">
                  <ScrollArea className="h-64">Chat messages...</ScrollArea>
                  <div className="flex gap-2 mt-4">
                    <Input placeholder="Type a message..." />
                    <Button>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardContent className="p-6">
                  <div>Viewer count, tips, stream health, etc.</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
