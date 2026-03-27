import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import type { AgentInfo } from "./types"

const BUTTON_ID_PREFIX = "agent_switch_"
const BUTTONS_PER_ROW = 5

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16)
}

export function buildAgentEmbed(
  agentName: string,
  color?: string,
  status?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(agentName)

  if (color) {
    embed.setColor(hexToDecimal(color))
  }

  if (status) {
    embed.setDescription(status)
  }

  return embed
}

export function buildAgentButtons(
  agents: AgentInfo[],
  currentAgent: string,
): ActionRowBuilder<ButtonBuilder>[] {
  if (agents.length === 0) return []

  const rows: ActionRowBuilder<ButtonBuilder>[] = []

  for (let i = 0; i < agents.length; i += BUTTONS_PER_ROW) {
    const rowAgents = agents.slice(i, i + BUTTONS_PER_ROW)
    const row = new ActionRowBuilder<ButtonBuilder>()

    for (const agent of rowAgents) {
      const button = new ButtonBuilder()
        .setCustomId(`${BUTTON_ID_PREFIX}${agent.name}`)
        .setLabel(agent.name)
        .setStyle(agent.name === currentAgent ? ButtonStyle.Primary : ButtonStyle.Secondary)

      row.addComponents(button)
    }

    rows.push(row)
  }

  return rows
}

export function parseButtonInteraction(customId: string): string | null {
  if (!customId.startsWith(BUTTON_ID_PREFIX)) return null
  const agentName = customId.slice(BUTTON_ID_PREFIX.length)
  return agentName || null
}
