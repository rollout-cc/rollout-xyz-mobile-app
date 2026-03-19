

# Reorder Member Card Sections + Auto-Populate Admin Info from Connections

## New Section Order (inside each member card)

```text
1. Personal Info        (first name, last name, DOB)
2. PRO & MLC Connections (BMI, ASCAP, SESAC, SoundExchange, The MLC)
3. Admin Info           (PRO auto-filled from connection, IPI, publisher, pub admin, pub PRO, ISNI, Spotify URI, distributor, record label)
4. Travel Info          (KTN, license, seat, airline, passport, dietary, notes)
5. Clothing             (shirt, pants, shoe, dress, hat, brands)
```

## Auto-Populate Logic

When a user connects to a PRO source (BMI, ASCAP, or SESAC) in the Connections section, automatically update the member's `pro_name` field in `artist_travel_info` to match. This means:

- In `MemberConnections`, after a successful connect/save to BMI/ASCAP/SESAC, call `onUpdate({ pro_name: sourceName })` on the parent member
- The PRO field in Admin Info will reflect this automatically (already bound to `member.pro_name`)
- User can still manually override PRO in Admin Info if needed

## Changes

| File | Change |
|---|---|
| `ArtistInfoTab.tsx` | Reorder the 5 sections inside `MemberCard` to: Personal → Connections → Admin → Travel → Clothing |
| `ArtistInfoTab.tsx` | Pass an `onProChange` callback to `MemberConnections` |
| `MemberConnections.tsx` | Accept optional `onProChange` prop; call it when BMI/ASCAP/SESAC is connected |

No database or schema changes needed.

