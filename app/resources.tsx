// app/resources.tsx
// LGBTQ+ support services and community resources.
// Portland-focused with national crisis lines always at top.
import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as C } from '../src/theme/colors';

// ─── Data ─────────────────────────────────────────────────────────────────────

type ResourceLink = {
  label: string;
  value: string;
  action: 'call' | 'sms' | 'web';
};

type Resource = {
  name: string;
  description: string;
  links: ResourceLink[];
};

type Category = {
  title: string;
  emoji: string;
  accent: string;
  note?: string;
  resources: Resource[];
};

const CATEGORIES: Category[] = [
  {
    title: 'Crisis Support',
    emoji: '🆘',
    accent: '#F87171',
    note: 'If you are in immediate danger, call 911.',
    resources: [
      {
        name: 'The Trevor Project',
        description: 'Crisis intervention and suicide prevention for LGBTQ+ young people under 25. Available 24/7.',
        links: [
          { label: 'Call', value: '1-866-488-7386', action: 'call' },
          { label: 'Text START', value: '678-678', action: 'sms' },
          { label: 'Chat', value: 'https://www.thetrevorproject.org/get-help', action: 'web' },
        ],
      },
      {
        name: 'Trans Lifeline',
        description: 'Peer support hotline run by and for trans people. Operators are trans themselves.',
        links: [
          { label: 'Call', value: '877-565-8860', action: 'call' },
          { label: 'Website', value: 'https://translifeline.org', action: 'web' },
        ],
      },
      {
        name: 'Crisis Text Line',
        description: 'Free crisis counseling via text, available 24/7. Text HOME to connect with a counselor.',
        links: [
          { label: 'Text HOME', value: '741741', action: 'sms' },
          { label: 'Website', value: 'https://www.crisistextline.org', action: 'web' },
        ],
      },
      {
        name: 'Lines for Life (Oregon)',
        description: 'Oregon\'s statewide crisis line for suicide and substance use crises. Available 24/7.',
        links: [
          { label: 'Call', value: '1-800-273-8255', action: 'call' },
          { label: 'Website', value: 'https://www.linesforlife.org', action: 'web' },
        ],
      },
    ],
  },
  {
    title: 'Portland Community',
    emoji: '🌹',
    accent: '#34D399',
    note: 'Local organizations serving the Portland LGBTQ+ community.',
    resources: [
      {
        name: 'Q Center',
        description: 'Portland\'s LGBTQ+ community center offering support groups, events, resources, and a welcoming space for all.',
        links: [
          { label: 'Website', value: 'https://www.qpdx.org', action: 'web' },
          { label: 'Call', value: '503-234-7837', action: 'call' },
        ],
      },
      {
        name: 'Outside In',
        description: 'Serving LGBTQ+ and homeless youth ages 14–25 in Portland. Shelter, health services, job training, and more.',
        links: [
          { label: 'Website', value: 'https://outsidein.org', action: 'web' },
          { label: 'Call', value: '503-223-4121', action: 'call' },
        ],
      },
      {
        name: 'Basic Rights Oregon',
        description: 'Oregon\'s LGBTQ+ civil rights organization. Policy advocacy, community organizing, and legal resources.',
        links: [
          { label: 'Website', value: 'https://www.basicrights.org', action: 'web' },
        ],
      },
      {
        name: 'PFLAG Portland',
        description: 'Support, education, and advocacy for LGBTQ+ people and their families. Monthly meetings in Portland.',
        links: [
          { label: 'Website', value: 'https://pflagpdx.org', action: 'web' },
        ],
      },
      {
        name: 'Cascade AIDS Project',
        description: 'HIV/AIDS prevention, testing, care, and support services for the Portland community. No judgment, all welcome.',
        links: [
          { label: 'Website', value: 'https://www.capnw.org', action: 'web' },
          { label: 'Call', value: '503-223-5907', action: 'call' },
        ],
      },
    ],
  },
  {
    title: 'Health & Wellness',
    emoji: '🏥',
    accent: '#60A5FA',
    note: 'Gender-affirming and LGBTQ+-friendly healthcare in Portland.',
    resources: [
      {
        name: 'OHSU Transgender Health Program',
        description: 'Oregon Health & Science University\'s comprehensive gender-affirming care program. HRT, surgery referrals, mental health, and more.',
        links: [
          { label: 'Website', value: 'https://www.ohsu.edu/transgender-health', action: 'web' },
          { label: 'Call', value: '503-494-7970', action: 'call' },
        ],
      },
      {
        name: 'Planned Parenthood Columbia Willamette',
        description: 'Gender-affirming hormone therapy, sexual health, STI testing, and more at multiple Portland locations.',
        links: [
          { label: 'Website', value: 'https://www.plannedparenthood.org/planned-parenthood-columbia-willamette', action: 'web' },
          { label: 'Call', value: '503-775-4931', action: 'call' },
        ],
      },
      {
        name: 'Equi Institute',
        description: 'Portland\'s LGBTQ+ health and wellness center. Primary care, behavioral health, and community programming.',
        links: [
          { label: 'Website', value: 'https://equiinstitute.org', action: 'web' },
          { label: 'Call', value: '503-360-9775', action: 'call' },
        ],
      },
    ],
  },
  {
    title: 'Legal & Advocacy',
    emoji: '⚖️',
    accent: '#FBBF24',
    resources: [
      {
        name: 'Lambda Legal',
        description: 'National LGBTQ+ legal rights organization. Legal help desk available for questions about discrimination, housing, employment, and more.',
        links: [
          { label: 'Help Desk', value: 'https://www.lambdalegal.org/helpdesk', action: 'web' },
          { label: 'Website', value: 'https://www.lambdalegal.org', action: 'web' },
        ],
      },
      {
        name: 'Oregon Law Center',
        description: 'Free civil legal services for low-income Oregonians, including LGBTQ+ Oregonians facing discrimination.',
        links: [
          { label: 'Website', value: 'https://oregonlawcenter.org', action: 'web' },
          { label: 'Call', value: '503-684-3763', action: 'call' },
        ],
      },
      {
        name: 'Oregon Bureau of Labor & Industries',
        description: 'File a complaint about employment or housing discrimination based on sexual orientation or gender identity.',
        links: [
          { label: 'Website', value: 'https://www.oregon.gov/boli', action: 'web' },
          { label: 'Call', value: '971-673-0761', action: 'call' },
        ],
      },
    ],
  },
  {
    title: 'Youth & Family',
    emoji: '🌈',
    accent: '#A78BFA',
    resources: [
      {
        name: 'Outside In',
        description: 'Drop-in center and shelter for LGBTQ+ youth and young adults experiencing homelessness in Portland.',
        links: [
          { label: 'Website', value: 'https://outsidein.org', action: 'web' },
          { label: 'Call', value: '503-223-4121', action: 'call' },
        ],
      },
      {
        name: 'Sexual Minority Youth Resource Center (SMYRC)',
        description: 'A safe, affirming drop-in center for LGBTQ+ youth in Portland. Meals, support groups, art programs, and community.',
        links: [
          { label: 'Website', value: 'https://www.linesforlife.org/smyrc', action: 'web' },
          { label: 'Call', value: '503-872-9664', action: 'call' },
        ],
      },
      {
        name: 'PFLAG Portland',
        description: 'Family support for parents, families, and friends of LGBTQ+ people. Monthly meetings and a warm community.',
        links: [
          { label: 'Website', value: 'https://pflagpdx.org', action: 'web' },
        ],
      },
    ],
  },
];

// ─── Link button ──────────────────────────────────────────────────────────────

function LinkButton({
  link,
  accent,
}: {
  link: ResourceLink;
  accent: string;
}) {
  function handlePress() {
    if (link.action === 'call') {
      Linking.openURL(`tel:${link.value.replace(/\D/g, '')}`);
    } else if (link.action === 'sms') {
      Linking.openURL(`sms:${link.value.replace(/\D/g, '')}`);
    } else {
      Linking.openURL(link.value);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: accent + '22',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: accent + '55',
      }}
    >
      <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
        {link.label}
      </Text>
    </Pressable>
  );
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, accent }: { resource: Resource; accent: string }) {
  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
    }}>
      <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
        {resource.name}
      </Text>
      <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
        {resource.description}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {resource.links.map(link => (
          <LinkButton key={link.label} link={link} accent={accent} />
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResourcesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Community Resources',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary, fontWeight: '800' },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>
          You are not alone 🏳️‍🌈
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 6, marginBottom: 24, lineHeight: 20 }}>
          Resources for the LGBTQ+ community in Portland and beyond.
          Crisis lines are available 24/7 — please reach out.
        </Text>

        {CATEGORIES.map(cat => (
          <View key={cat.title} style={{ marginBottom: 28 }}>
            {/* Category header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: cat.note ? 6 : 12,
            }}>
              <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
              <Text style={{
                color: cat.accent,
                fontWeight: '900',
                fontSize: 15,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}>
                {cat.title}
              </Text>
            </View>

            {cat.note && (
              <Text style={{
                color: C.textMuted,
                fontSize: 12,
                marginBottom: 12,
                fontStyle: 'italic',
              }}>
                {cat.note}
              </Text>
            )}

            {cat.resources.map(r => (
              <ResourceCard key={r.name} resource={r} accent={cat.accent} />
            ))}
          </View>
        ))}

        <View style={{ marginTop: 8, padding: 16, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Know a resource we should add? Reach out to us at{'\n'}
            <Text style={{ color: C.teal }}>hello@sequins.app</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
