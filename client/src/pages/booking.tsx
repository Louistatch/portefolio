import { SEO } from "@/components/seo";
import { useState } from "react";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Booking() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name || !email || !topic) {
      toast({ title: "Validation Error", description: "Please fill all fields and select a date.", variant: "destructive" });
      return;
    }

    createAppointment.mutate({
      name,
      email,
      date,
      topic
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({ title: "Request Sent", description: "Your appointment request has been received." });
      },
      onError: (err) => {
        toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Request Submitted</h1>
        <p className="text-xl text-muted-foreground font-serif mb-8">
          Thank you for reaching out. I will review your request for the proposed date and reply to your email shortly to confirm the meeting details.
        </p>
        <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
      </div>
    );
  }

  return (
    <>
      <SEO title="Schedule a Meeting" description="Book a consultation or research meeting with Louis Tatchida." />
      
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Schedule a Meeting</h1>
          <p className="text-lg text-muted-foreground font-serif">
            Select a preferred date and provide details about the consultation. I'm available for academic collaborations, industry advisory, and speaking engagements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start bg-card p-8 lg:p-12 rounded-3xl border border-border/50 shadow-xl">
          {/* Calendar Side */}
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" /> Select Date
            </h2>
            <div className="bg-background border border-border/50 p-4 rounded-2xl flex justify-center shadow-inner">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
              />
            </div>
            {date && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center gap-3 text-primary font-medium">
                <Clock className="w-5 h-5" />
                Selected: {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>

          {/* Form Side */}
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold">Your Details</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                <Input 
                  placeholder="Dr. Jane Doe" 
                  value={name} onChange={e => setName(e.target.value)} 
                  className="bg-background px-4 py-6 rounded-xl"
                  required 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="jane.doe@university.edu" 
                  value={email} onChange={e => setEmail(e.target.value)} 
                  className="bg-background px-4 py-6 rounded-xl"
                  required 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Meeting Topic / Agenda</label>
                <Textarea 
                  placeholder="Please describe the purpose of our meeting..." 
                  value={topic} onChange={e => setTopic(e.target.value)} 
                  className="bg-background min-h-[150px] p-4 rounded-xl resize-none"
                  required 
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 text-lg rounded-xl shadow-lg hover-elevate" 
                disabled={createAppointment.isPending}
              >
                {createAppointment.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
