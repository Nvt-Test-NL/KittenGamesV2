"use client";

import React from "react";
import Header from "../../components/Header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="privacy" />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-6">Privacyverklaring Pjotter-AI</h1>

        <p className="text-gray-300 mb-6">
          Deze privacyverklaring beschrijft hoe Pjotter-AI (onderdeel van Pjotters-Company) persoonsgegevens verwerkt in overeenstemming met de AVG (EU) en de Nederlandse wetgeving. Deze verklaring is bedoeld als basis en kan door jou verder worden aangevuld.
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Verwerkingsverantwoordelijke</h2>
          <p className="text-gray-300">
            Pjotters-Company is de verwerkingsverantwoordelijke. Contact: <span className="text-gray-200">[pjotters-chain@gmail.com]</span>.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Welke gegevens verwerken we?</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Chatinhoud die je invoert in Pjotter-AI, inclusief tekst en eventuele afbeeldingen/URL’s.</li>
            <li>Technische gegevens zoals apparaat-/browsertype en geanonimiseerde analytische gegevens (indien ingeschakeld).</li>
            <li>Instellingen zoals taal, sessies, en consent-status; lokaal opgeslagen in je browser (localStorage).</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Doeleinden en rechtsgrond</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Dienstverlening: het leveren van AI-chatfunctionaliteit en sessiebeheer (gerechtvaardigd belang en/of uitvoering overeenkomst).</li>
            <li>Verbetering van de dienst: kwaliteits- en prestatie-analyse (gerechtvaardigd belang).</li>
            <li>Toestemming-gebaseerde functies: alleen met jouw expliciete toestemming (bijv. eerste-gebruik pop-up).</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Bewaartermijn</h2>
          <p className="text-gray-300">
            Chat-sessies worden lokaal bewaard op jouw apparaat (localStorage) totdat je ze zelf verwijdert. Server-side logs (indien van toepassing) worden zo kort mogelijk bewaard en uitsluitend voor beveiliging en foutoplossing.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Delen met derden</h2>
          <p className="text-gray-300">
            We delen geen persoonsgegevens met derden tenzij dit noodzakelijk is voor de werking van de dienst (bijv. AI API-provider) of wanneer we hiertoe wettelijk verplicht zijn. Bij gebruik van externe AI-providers worden gegevens alleen verzonden zoals strikt noodzakelijk voor het antwoord; waar mogelijk worden privacyvriendelijke instellingen toegepast.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Jouw rechten</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Recht op inzage, rectificatie en gegevenswissing.</li>
            <li>Recht op beperking van verwerking en bezwaar.</li>
            <li>Recht op gegevensoverdraagbaarheid (voor zover van toepassing).</li>
            <li>Recht om toestemming in te trekken; dit heeft geen terugwerkende kracht.</li>
          </ul>
          <p className="text-gray-300">Neem contact op via <span className="text-gray-200">[jouw e-mailadres / contactformulier]</span> om deze rechten uit te oefenen.</p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Cookies & lokale opslag</h2>
          <p className="text-gray-300">
            Pjotter-AI gebruikt lokale opslag (localStorage) voor sessies en instellingen. Eventuele cookies worden uitsluitend gebruikt voor noodzakelijke functionaliteit of met jouw toestemming.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">Openrouter</h2>
          <p className="text-gray-300">
            Pjotter-AI gebruikt Openrouter voor AI-generatie en antwoorden. Om gratis Pjotter-AI te gebruiken ga je ermee akkoord dat Openrouter.ai jouw data gebruikt voor training en verbetering van hun AI-models.
          </p>
        </section>

        <section className="space-y-2 mb-8">
          <h2 className="text-xl font-semibold text-white">Wijzigingen</h2>
          <p className="text-gray-300">We kunnen deze privacyverklaring aanpassen. Controleer regelmatig de datum hieronder.</p>
          <p className="text-gray-400 text-sm">Laatste update: 22 sep 2025</p>
        </section>
      </main>
    </div>
  );
}
