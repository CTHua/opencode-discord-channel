import { Client, GatewayIntentBits } from "discord.js"
import type {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  MessageActionRowComponentBuilder,
} from "discord.js"
import { TextChannel } from "discord.js"
import { splitMessage } from "./message-splitter"
import type { DiscordMessage } from "./types"

export type DiscordClientWrapper = ReturnType<typeof createDiscordClient>

export function createDiscordClient() {
  let discordClient: Client | null = null
  let botUserId: string | null = null
  let messageHandler: ((msg: DiscordMessage) => void) | null = null
  let buttonHandler:
    | ((customId: string, userId: string, username: string) => void)
    | null = null
  let selectMenuHandler:
    | ((customId: string, values: string[], userId: string) => void)
    | null = null
  let rawButtonHandler:
    | ((interaction: any) => Promise<boolean>)
    | null = null
  let modalSubmitHandler:
    | ((customId: string, fields: Map<string, string>, userId: string) => void)
    | null = null

  async function getChannel(channelId: string): Promise<TextChannel> {
    if (!discordClient) throw new Error("Discord client not connected")
    let channel = discordClient.channels.cache.get(channelId)
    if (!channel) {
      channel = (await discordClient.channels.fetch(channelId)) ?? undefined
    }
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${channelId} not found or not text-based`)
    }
    return channel as TextChannel
  }

  return {
    async connect(token: string): Promise<void> {
      if (discordClient) {
        await discordClient.destroy()
        discordClient = null
        botUserId = null
      }

      discordClient = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      })

      discordClient.on("messageCreate", (msg: any) => {
        if (!messageHandler) return
        messageHandler({
          content: msg.content,
          authorId: msg.author.id,
          username: msg.author.username,
          channelId: msg.channelId,
          messageId: msg.id,
        })
      })

      discordClient.on("interactionCreate", async (interaction: any) => {
        const onModal = modalSubmitHandler
        const onRawButton = rawButtonHandler
        const onButton = buttonHandler
        const onSelect = selectMenuHandler

        if (interaction.isModalSubmit?.()) {
          try {
            await interaction.deferUpdate()
          } catch {}
          if (onModal) {
            const fields = new Map<string, string>()
            for (const [key, comp] of interaction.fields.fields) {
              fields.set(comp.customId ?? key, comp.value)
            }
            onModal(interaction.customId, fields, interaction.user.id)
          }
          return
        }

        if (interaction.isButton?.()) {
          if (onRawButton) {
            const handled = await onRawButton(interaction)
            if (handled) return
          }
          try {
            await interaction.deferUpdate()
          } catch {}
          if (onButton) {
            onButton(
              interaction.customId,
              interaction.user.id,
              interaction.user.username,
            )
          }
          return
        }

        if (interaction.isStringSelectMenu?.()) {
          try {
            await interaction.deferUpdate()
          } catch {}
          if (onSelect) {
            onSelect(
              interaction.customId,
              interaction.values,
              interaction.user.id,
            )
          }
          return
        }
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Discord connection timeout (30s)")),
          30_000,
        )

        discordClient!.once("clientReady", () => {
          clearTimeout(timeout)
          botUserId = discordClient!.user?.id ?? null
          resolve()
        })

        discordClient!.login(token).catch((err: Error) => {
          clearTimeout(timeout)
          reject(
            new Error(
              `Discord login failed: ${err.message.replace(/[A-Za-z0-9_-]{20,}/g, "[REDACTED]")}`,
            ),
          )
        })
      })
    },

    async disconnect(): Promise<void> {
      await discordClient?.destroy()
      discordClient = null
      botUserId = null
    },

    async sendMessage(channelId: string, content: string): Promise<void> {
      const channel = await getChannel(channelId)
      const chunks = splitMessage(content)
      if (chunks.length === 0) return
      for (const chunk of chunks) {
        await channel.send(chunk)
      }
    },

    async sendEmbed(channelId: string, embed: EmbedBuilder): Promise<void> {
      const channel = await getChannel(channelId)
      await channel.send({ embeds: [embed] })
    },

    async sendButtons(
      channelId: string,
      embed: EmbedBuilder,
      rows: ActionRowBuilder<ButtonBuilder>[],
    ): Promise<void> {
      const channel = await getChannel(channelId)
      await channel.send({ embeds: [embed], components: rows })
    },

    async sendSelectMenu(
      channelId: string,
      embed: EmbedBuilder,
      rows: ActionRowBuilder<StringSelectMenuBuilder>[],
    ): Promise<string> {
      const channel = await getChannel(channelId)
      const msg = await channel.send({ embeds: [embed], components: rows })
      return msg.id
    },

    async startTyping(channelId: string): Promise<void> {
      const channel = await getChannel(channelId)
      await channel.sendTyping()
    },

    async validateChannel(channelId: string): Promise<boolean> {
      try {
        await getChannel(channelId)
        return true
      } catch {
        return false
      }
    },

    onMessage(handler: (msg: DiscordMessage) => void): void {
      messageHandler = handler
    },

    onButtonInteraction(
      handler: (customId: string, userId: string, username: string) => void,
    ): void {
      buttonHandler = handler
    },

    onSelectMenuInteraction(
      handler: (customId: string, values: string[], userId: string) => void,
    ): void {
      selectMenuHandler = handler
    },

    onRawButtonInteraction(
      handler: (interaction: any) => Promise<boolean>,
    ): void {
      rawButtonHandler = handler
    },

    onModalSubmit(
      handler: (
        customId: string,
        fields: Map<string, string>,
        userId: string,
      ) => void,
    ): void {
      modalSubmitHandler = handler
    },

    async sendQuestion(
      channelId: string,
      embeds: EmbedBuilder[],
      rows: ActionRowBuilder<MessageActionRowComponentBuilder>[],
    ): Promise<string> {
      const channel = await getChannel(channelId)
      const msg = await channel.send({ embeds, components: rows })
      return msg.id
    },

    async deleteMessage(channelId: string, messageId: string): Promise<void> {
      const channel = await getChannel(channelId)
      const msg = await channel.messages.fetch(messageId)
      await msg.delete()
    },

    getBotUserId(): string | null {
      return botUserId
    },
  }
}
