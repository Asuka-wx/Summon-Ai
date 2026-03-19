import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type NotificationEmailProps = {
  title: string;
  body: string;
  actionLabel: string;
  href: string;
  unsubscribeHref: string;
};

export function NotificationEmail({
  title,
  body,
  actionLabel,
  href,
  unsubscribeHref,
}: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>{title}</Heading>
          <Text style={textStyle}>{body}</Text>
          <Section style={buttonSectionStyle}>
            <Button href={href} style={buttonStyle}>
              {actionLabel}
            </Button>
          </Section>
          <Hr style={dividerStyle} />
          <Text style={footerStyle}>
            SummonAI notification system
          </Text>
          <Text style={unsubscribeStyle}>
            <a href={unsubscribeHref}>Unsubscribe from this email type</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f8f4ec",
  fontFamily: "Arial, sans-serif",
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px",
  border: "1px solid #eadfcd",
};

const headingStyle = {
  fontSize: "24px",
  lineHeight: "32px",
  margin: "0 0 12px",
  color: "#201913",
};

const textStyle = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#4d4134",
};

const buttonSectionStyle = {
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: "#c55d2d",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "12px 20px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "600",
};

const dividerStyle = {
  borderColor: "#eadfcd",
  margin: "24px 0",
};

const footerStyle = {
  fontSize: "13px",
  color: "#7a6a58",
};

const unsubscribeStyle = {
  fontSize: "12px",
  color: "#7a6a58",
};
