export interface ClinicConfig {
  identity: {
    clinicName: string;
    tagline: string;
    description: string;
    doctorName: string;
    doctorTitle: string;
    doctorBio: string;
    doctorQualifications: string[];
    avatarUrl: string;
    brandBadge: string;
  };
  contact: {
    phone: string;
    formattedPhone: string;
    emergencyPhone: string;
    email: string;
    address: {
      street: string;
      suite?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      googleMapsUrl: string;
      parkingInstructions: string;
      publicTransitNote: string;
    };
    hoursDisplay: string;
  };
  policies: {
    cancellationNoticeHours: number;
    arrivalMinutesEarly: number;
    acceptedPaymentMethods: string[];
    emergencyNotice: string;
    intakeInstructions: string[];
  };
  theme: {
    accentColor: string;
    metaTitle: string;
    metaDescription: string;
  };
}

export const clinicConfig: ClinicConfig = {
  identity: {
    clinicName: "Apex Health & Wellness Clinic",
    tagline: "Comprehensive, patient-centered primary care at the edge",
    description:
      "Modern family medicine and preventative health consultations delivered with personal care and punctuality.",
    doctorName: "Dr. Sarah Jenkins",
    doctorTitle: "MD, Board-Certified Family Physician",
    doctorBio:
      "Dr. Jenkins has over 12 years of clinical experience specializing in preventive health, adult care, chronic illness management, and lifestyle medicine. She believes in treating the whole person with timely, unhurried appointments.",
    doctorQualifications: [
      "Doctor of Medicine (MD) - Johns Hopkins School of Medicine",
      "Residency in Family Medicine - UCSF Medical Center",
      "American Board of Family Medicine (ABFM) Certified",
      "Member, American Academy of Family Physicians (AAFP)",
    ],
    avatarUrl:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
    brandBadge: "Verified Medical Practice",
  },
  contact: {
    phone: "+1-555-019-4821",
    formattedPhone: "(555) 019-4821",
    emergencyPhone: "911",
    email: "care@apexwellnessclinic.com",
    address: {
      street: "742 Evergreen Medical Plaza",
      suite: "Suite 300",
      city: "San Francisco",
      state: "CA",
      postalCode: "94107",
      country: "United States",
      googleMapsUrl: "https://maps.google.com/?q=742+Evergreen+Terrace",
      parkingInstructions:
        "Complimentary validated parking available in the attached underground garage (Levels B1 & B2). Take elevator directly to 3rd floor.",
      publicTransitNote:
        "Conveniently located 2 blocks from the 4th & King Caltrain and Muni Metro T-Line.",
    },
    hoursDisplay: "Monday – Friday: 8:30 AM – 5:00 PM | Closed Weekends & Major Holidays",
  },
  policies: {
    cancellationNoticeHours: 4,
    arrivalMinutesEarly: 10,
    acceptedPaymentMethods: [
      "Cash",
      "Credit / Debit Card (Visa, MasterCard, Amex)",
      "Health Savings Account (HSA / FSA)",
      "Major In-Network Health Insurance Plans",
    ],
    emergencyNotice:
      "If you are experiencing a life-threatening medical emergency, chest pain, severe shortness of breath, or sudden neurological symptoms, please dial 911 immediately or proceed to the nearest emergency department.",
    intakeInstructions: [
      "Valid Government-issued Photo Identification",
      "Active Health Insurance / HSA card (if applicable)",
      "Comprehensive list of current prescription and OTC medications",
      "Any recent lab results or imaging reports relevant to your visit",
    ],
  },
  theme: {
    accentColor: "#1A5BFA",
    metaTitle: "Apex Health & Wellness Clinic | Appointment Booking",
    metaDescription:
      "Book your appointment online with Dr. Sarah Jenkins at Apex Health & Wellness Clinic. Fast, secure, and personalized medical care.",
  },
};
