import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Email } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ClassificationModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const priorityOptions = [
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Requires immediate attention',
    badgeClass: 'bg-red-100 text-red-800'
  },
  {
    value: 'normal',
    label: 'Normal',
    description: 'Standard priority',
    badgeClass: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'low',
    label: 'Low',
    description: 'Can be handled later',
    badgeClass: 'bg-green-100 text-green-800'
  }
];

export default function ClassificationModal({
  email,
  isOpen,
  onClose,
  onSuccess
}: ClassificationModalProps) {
  const [selectedPriority, setSelectedPriority] = useState(email?.priority || 'normal');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!email || !selectedPriority) return;

    setIsSubmitting(true);

    try {
      await apiRequest('POST', '/api/feedback', {
        emailId: email.id,
        originalPriority: email.priority,
        correctedPriority: selectedPriority,
        reason: reason.trim() || null,
      });

      toast({
        title: 'Feedback Submitted',
        description: `Classification updated to "${selectedPriority}". The AI model will learn from this correction.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPriority = priorityOptions.find(p => p.value === email?.priority);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="classification-modal">
        <DialogHeader>
          <DialogTitle>Correct AI Classification</DialogTitle>
          <DialogDescription>
            Help improve the AI model by correcting this email's priority
          </DialogDescription>
        </DialogHeader>

        {email && (
          <div className="space-y-6">
            {/* Current Classification */}
            <div>
              <Label className="text-sm text-gray-700 mb-2 block">
                Current Classification:
              </Label>
              <Badge className={`${currentPriority?.badgeClass} text-sm font-medium px-3 py-2`}>
                {currentPriority?.label} ({email.confidence}% confidence)
              </Badge>
            </div>

            {/* Priority Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Select Correct Priority:
              </Label>
              
              <RadioGroup
                value={selectedPriority}
                onValueChange={setSelectedPriority}
                className="space-y-3"
                data-testid="priority-radio-group"
              >
                {priorityOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      data-testid={`radio-${option.value}`}
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge className={`${option.badgeClass} text-sm font-medium`}>
                          {option.label}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {option.description}
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Reason Input */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Reason for Correction (Optional):
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
                placeholder="Help us understand why this classification was incorrect..."
                data-testid="textarea-correction-reason"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex space-x-3">
          <Button
            onClick={handleSubmit}
            disabled={!selectedPriority || isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            data-testid="button-submit-correction"
          >
            {isSubmitting ? 'Updating...' : 'Update & Train Model'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            data-testid="button-cancel-correction"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
