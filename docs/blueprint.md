# **App Name**: BMV Back Office

## Core Features:

- Interactive Kanban Board: Visualize and move opportunities between pipeline stages with drag-and-drop functionality, updating the Firestore database upon stage changes.
- Pipeline Analytics Dashboard: Display key performance indicators (KPIs) such as conversion rates, average time per stage, and value forecasts, updated regularly and stored in Firestore.
- Automated Contract Generation: Automatically generate contracts and implementation tasks upon closing an opportunity as 'Won,' triggered by a Cloud Function.
- Internal Chat System: Enable direct communication between authenticated users with real-time messaging, read status, and optional file attachments, storing messages in Firestore.
- AI-Powered Pipeline Analysis: Use Windsurf IA tool to calculate closing trends and suggest follow-ups for opportunities in the pipeline, providing actionable insights for sales teams.
- Chat Summary Generation: Windsurf IA provides automated summarization of chats on a daily basis to extract the most salient points.
- Opportunity Database: All opportunity and sales related data are saved and retrieved from Firestore.

## Style Guidelines:

- Primary color: Deep teal (#008080) for a professional and trustworthy feel.
- Background color: Light gray (#E0E0E0) to provide a neutral backdrop that enhances readability and reduces eye strain.
- Accent color: Gold (#FFD700) to highlight key actions and important information, drawing user attention effectively.
- Body font: 'PT Sans' a humanist sans-serif which is appropriate for longer bodies of text.
- Headline font: 'Playfair' for a contemporary and elegant style; if longer text is anticipated, use 'PT Sans' for body text. Font Pairing.
- Use consistent and minimalist icons to represent different pipeline stages, actions, and modules, enhancing usability.
- Employ a clean and structured layout with clear sections for the Kanban board, analytics dashboard, and chat interface, ensuring ease of navigation.