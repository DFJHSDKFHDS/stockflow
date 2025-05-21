# **App Name**: StockFlow

## Core Features:

- Inventory Dashboard: Responsive dashboard displaying key inventory metrics and providing an overview of incoming, outgoing, and total product counts.
- Product Registration: Form for registering new products, including fields for product name, description, initial stock, and other relevant details.
- Incoming Product Log: Form to log incoming products, updating the inventory with the received quantity. Can store timestamps of deliveries.
- Outgoing Product Log: Form to track outgoing products, reducing the inventory accordingly. Include fields for quantity, destination, and reason for removal.
- AI Gate Pass Generation: AI powered tool to generate gate passes based on outgoing product information, formatted for thermal printer output. Includes details like product name, quantity, destination, date, and a QR code linking to more details. The LLM will use reasoning to decide if a certain piece of outgoing product metadata, is important for displaying on the physical ticket, to ensure compliance.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and reliability.
- Background color: Light gray (#EEEEEE) for a clean and modern interface.
- Accent color: Purple (#9575CD) to highlight key actions and elements, creating a visually appealing contrast.
- Clean, sans-serif fonts (like Open Sans or Roboto) for clear readability across different screen sizes.
- Consistent use of simple, modern icons to represent different inventory actions and categories.
- Use of a grid-based layout for organizing information and ensuring a responsive design.
- Subtle animations for feedback on user interactions, like loading states or successful form submissions.