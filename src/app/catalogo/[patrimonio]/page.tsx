import { EquipmentApp } from '../../_components/equipment-app'

export default async function EquipmentDetailsPage({
  params,
}: {
  params: Promise<{ patrimonio: string }>
}) {
  const { patrimonio } = await params
  return <EquipmentApp mode="detail" patrimonio={patrimonio} />
}
