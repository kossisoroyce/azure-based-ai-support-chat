import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertFaqSchema } from "@shared/schema";
import type { FAQ, InsertFAQ } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { toast } = useToast();
  const form = useForm<InsertFAQ>({
    resolver: zodResolver(insertFaqSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });

  const { data: faqs = [] } = useQuery<FAQ[]>({
    queryKey: ["/api/faqs"],
  });

  const createFAQ = useMutation({
    mutationFn: async (data: InsertFAQ) => {
      await apiRequest("POST", "/api/faqs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      form.reset();
      toast({
        title: "FAQ Created",
        description: "The FAQ has been created successfully.",
      });
    },
  });

  const deleteFAQ = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/faqs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({
        title: "FAQ Deleted",
        description: "The FAQ has been deleted successfully.",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    createFAQ.mutate(data);
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createFAQ.isPending}
                  className="w-full"
                >
                  Create FAQ
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing FAQs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="p-4 border rounded-lg flex justify-between items-start"
                >
                  <div>
                    <h3 className="font-medium">{faq.question}</h3>
                    <p className="text-muted-foreground mt-1">{faq.answer}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteFAQ.mutate(faq.id)}
                    disabled={deleteFAQ.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}