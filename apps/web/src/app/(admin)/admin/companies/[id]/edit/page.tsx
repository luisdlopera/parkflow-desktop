import ClientPage from "./ClientPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "1" }];
}

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  return <ClientPage params={params} />;
}
