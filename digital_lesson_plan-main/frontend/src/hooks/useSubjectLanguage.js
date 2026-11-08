import { useState, useEffect } from 'react';

export const useSubjectLanguage = (subjectName) => {
    const [language, setLanguage] = useState('English');
    const [labels, setLabels] = useState({});

    // Translation Dictionary
    const translations = {
        'English': {
            // Common
            'Create': 'Create',
            'Update': 'Update',
            'Cancel': 'Cancel',
            'Delete': 'Delete',
            'Save': 'Save',
            'Edit': 'Edit',
            'View': 'View',
            'Close': 'Close',
            'Download': 'Download',
            'Generating': 'Generating...',

            // Unit Page
            'Units': 'Units',
            'Create Unit': 'Create Unit',
            'Unit Number': 'Unit Number',
            'Unit Title': 'Unit Title',
            'Key Unit Competence': 'Key Unit Competence',
            'No units found': 'No units found',

            // Lesson Page
            'Lessons': 'Lessons',
            'Create Lesson': 'Create Lesson',
            'Lesson Number': 'Lesson Number',
            'Lesson Title': 'Lesson Title',
            'Duration': 'Duration',
            'Topic Area': 'Topic Area',
            'Sub-topic Area': 'Sub-topic Area',
            'No lessons found': 'No lessons found',

            // Lesson Plan Page
            'School Name': 'School Name',
            'Teacher\'s Name': 'Teacher\'s Name',
            'Term': 'Term',
            'Date': 'Date',
            'Subject': 'Subject',
            'Class': 'Class',
            'Unit Nº': 'Unit Nº',
            'Lesson Nº': 'Lesson Nº',
            'Class Size': 'Class Size',
            'Special Needs': 'Special Educational Needs',
            'Unit Title Label': 'Unit title',
            'Key Unit Competence Label': 'Key Unit Competence',
            'Title of the lesson': 'Title of the lesson',
            'Instructional Objective': 'Instructional Objective',
            'Plan for this Class': 'Plan for this Class (location: in / outside)',
            'Learning Materials': 'Learning Materials (for all learners)',
            'References': 'References',
            'Timing for each step': 'Timing for each step',
            'Description of teaching and learning activity': 'Description of teaching and learning activity',
            'Generic competences and Cross cutting issues': 'Generic competences and Cross cutting issues to be addressed + a short explanation',
            'Teacher activities': 'Teacher activities',
            'Learner activities': 'Learner activities',
            'Teacher\'s self-evaluation': 'Teacher\'s self-evaluation',

            // Form Labels
            'Teaching Date': 'Teaching Date',
            'Location': 'Location',
            'Reference Books': 'Reference Books (AI Knowledge Source)',
            'Learners': 'Learners',

            // Empty States & Subtitles
            'Organize units subtitle': 'Organize your subject content into units to start planning lessons.',
            'Add lessons subtitle': 'Add lessons to this unit to begin utilizing AI lesson plan generation.',
            'No Lesson Plan Yet': 'No Lesson Plan Yet',
            'AI Intro': 'Our AI can build a comprehensive REB-standard lesson plan following the 5Es model in seconds.',
            'Generate Pro Lesson Plan': 'Generate Pro Lesson Plan',

            // AI Status
            'AI Engine is Running': 'AI Engine is Running',
            'Reading Reference Books': 'Reading Reference Books',
            'Extracting context': 'Extracting context from your uploads...',
            'AI Curriculum Analysis': 'AI Curriculum Analysis',
            'Structuring activities': 'Structuring activities using 5Es model...',
            'Finalizing Table Layout': 'Finalizing Table Layout',
            'Polishing notations': 'Polishing pedagogical notations...',
        },
        'Kinyarwanda': {
            // Common
            'Create': 'Kurema',
            'Update': 'Kuvugurura',
            'Cancel': 'Kureka',
            'Delete': 'Gusiba',
            'Save': 'Kubika',
            'Edit': 'Guhindura',
            'View': 'Kureba',
            'Close': 'Gufunga',
            'Download': 'Gukurura',
            'Generating': 'Birimo gukorwa...',

            // Unit Page
            'Units': 'Imitwe',
            'Create Unit': 'Kurema Umutwe',
            'Unit Number': 'Nimero y\'Umutwe',
            'Unit Title': 'Umutwe w\'Igice',
            'Key Unit Competence': 'Ubushobozi Nyamukuru',
            'No units found': 'Nta mitwe yabonetse',

            // Lesson Page
            'Lessons': 'Amasomo',
            'Create Lesson': 'Kurema Isomo',
            'Lesson Number': 'Nimero y\'Isomo',
            'Lesson Title': 'Umutwe w\'Isomo',
            'Duration': 'Igihe',
            'Topic Area': 'Umurongo w\'Ibyigwa',
            'Sub-topic Area': 'Isi y\'Ibyigwa',
            'No lessons found': 'Nta masomo yabonetse',

            // Lesson Plan Page
            'School Name': 'Izina ry\'Ishuri',
            'Teacher\'s Name': 'Izina ry\'Umwarimu',
            'Term': 'Igihembwe',
            'Date': 'Itariki',
            'Subject': 'Isomo',
            'Class': 'Icyiciro',
            'Unit Nº': 'Umutwe Nº',
            'Lesson Nº': 'Isomo Nº',
            'Class Size': 'Umubare w\'Abanyeshuri',
            'Special Needs': 'Abakeneye Ubufasha Budasanzwe',
            'Unit Title Label': 'Umutwe w\'Igice',
            'Key Unit Competence Label': 'Ubushobozi Nyamukuru',
            'Title of the lesson': 'Umutwe w\'Isomo',
            'Instructional Objective': 'Intego y\'Isomo',
            'Plan for this Class': 'Aho Isomo ribera (imbere / hanze)',
            'Learning Materials': 'Imfashanyigisho',
            'References': 'Ibitabo byifashishijwe',
            'Timing for each step': 'Igihe kuri buri gice',
            'Description of teaching and learning activity': 'Uko imyigire n\'imyigishirize bikorwa',
            'Generic competences and Cross cutting issues': 'Ubushobozi bw\'ibanze n\'insanganyamatsiko',
            'Teacher activities': 'Ibikorwa by\'umwarimu',
            'Learner activities': 'Ibikorwa by\'umunyeshuri',
            'Teacher\'s self-evaluation': 'Isuzumabikorwa ry\'umwarimu',

            // Form Labels
            'Teaching Date': 'Itariki y\'Isomo',
            'Location': 'Aho isomo ribera',
            'Reference Books': 'Ibitabo byifashishwa (AI Knowledge Source)',
            'Learners': 'Abanyeshuri',

            // Empty States & Subtitles
            'Organize units subtitle': 'Tunganya ibigize isomo mu mitwe kugirango utangire gutegura amasomo.',
            'Add lessons subtitle': 'Ongeraho amasomo muri uyu mutwe kugirango utangire gukoresha AI mu gutegura amasomo.',
            'No Lesson Plan Yet': 'Nta Tegurwa ry\'Isomo',
            'AI Intro': 'AI yacu iragufasha gutegura isomo rinoze rijyanye n\'integanyanyigisho ya REB (5Es) mu m segonda.',
            'Generate Pro Lesson Plan': 'Tegura Isomo Ukoresheje AI',

            // AI Status
            'AI Engine is Running': 'AI Irimo Gukora',
            'Reading Reference Books': 'Irasoma Ibitabo byifashishwa',
            'Extracting context': 'Irahuza ibiri mu bitabo...',
            'AI Curriculum Analysis': 'Isesengura ry\'Integanyanyigisho',
            'Structuring activities': 'Irategura ibikorwa hakurikijwe 5Es...',
            'Finalizing Table Layout': 'Iratunganya imbonerahamwe',
            'Polishing notations': 'Iranoza imyandikire y\'uburezi...',
        },
        'French': {
            // Common
            'Create': 'Créer',
            'Update': 'Mettre à jour',
            'Cancel': 'Annuler',
            'Delete': 'Supprimer',
            'Save': 'Enregistrer',
            'Edit': 'Modifier',
            'View': 'Voir',
            'Close': 'Fermer',
            'Download': 'Télécharger',
            'Generating': 'Génération...',

            // Unit Page
            'Units': 'Unités',
            'Create Unit': 'Créer une Unité',
            'Unit Number': 'Numéro de l\'Unité',
            'Unit Title': 'Titre de l\'Unité',
            'Key Unit Competence': 'Compétence Clé',
            'No units found': 'Aucune unité trouvée',

            // Lesson Page
            'Lessons': 'Leçons',
            'Create Lesson': 'Créer une Leçon',
            'Lesson Number': 'Numéro de la Leçon',
            'Lesson Title': 'Titre de la Leçon',
            'Duration': 'Durée',
            'Topic Area': 'Domaine',
            'Sub-topic Area': 'Sous-domaine',
            'No lessons found': 'Aucune leçon trouvée',

            // Lesson Plan Page
            'School Name': 'Nom de l\'École',
            'Teacher\'s Name': 'Nom de l\'Enseignant',
            'Term': 'Trimestre',
            'Date': 'Date',
            'Subject': 'Matière',
            'Class': 'Classe',
            'Unit Nº': 'Unité Nº',
            'Lesson Nº': 'Leçon Nº',
            'Class Size': 'Taille de la Classe',
            'Special Needs': 'Besoins Éducatifs Spéciaux',
            'Unit Title Label': 'Titre de l\'Unité',
            'Key Unit Competence Label': 'Compétence Clé',
            'Title of the lesson': 'Titre de la Leçon',
            'Instructional Objective': 'Objectif Instructionnel',
            'Plan for this Class': 'Plan pour cette Classe (lieu)',
            'Learning Materials': 'Matériel Didactique',
            'References': 'Références',
            'Timing for each step': 'Minutage',
            'Description of teaching and learning activity': 'Description des activités',
            'Generic competences and Cross cutting issues': 'Compétences génériques et transversales',
            'Teacher activities': 'Activités de l\'enseignant',
            'Learner activities': 'Activités de l\'apprenant',
            'Teacher\'s self-evaluation': 'Auto-évaluation de l\'enseignant',

            // Form Labels
            'Teaching Date': 'Date d\'enseignement',
            'Location': 'Lieu',
            'Reference Books': 'Livres de référence (Source de connaissances IA)',
            'Learners': 'Apprenants',

            // Empty States & Subtitles
            'Organize units subtitle': 'Organisez le contenu de votre matière en unités pour commencer à planifier les leçons.',
            'Add lessons subtitle': 'Ajoutez des leçons à cette unité pour commencer à utiliser la génération de plans de cours par IA.',
            'No Lesson Plan Yet': 'Pas encore de plan de leçon',
            'AI Intro': 'Notre IA peut créer un plan de cours complet conforme aux normes REB (modèle 5E) en quelques secondes.',
            'Generate Pro Lesson Plan': 'Générer un Plan de Leçon Pro',

            // AI Status
            'AI Engine is Running': 'Le moteur IA est en marche',
            'Reading Reference Books': 'Lecture des livres de référence',
            'Extracting context': 'Extraction du contexte...',
            'AI Curriculum Analysis': 'Analyse du programme par IA',
            'Structuring activities': 'Structuration des activités (modèle 5E)...',
            'Finalizing Table Layout': 'Finalisation de la mise en page',
            'Polishing notations': 'Peaufinage des notations pédagogiques...',
        },
        'Kiswahili': {
            // Common
            'Create': 'Unda',
            'Update': 'Sasisha',
            'Cancel': 'Ghairi',
            'Delete': 'Futa',
            'Save': 'Hifadhi',
            'Edit': 'Hariri',
            'View': 'Ona',
            'Close': 'Funga',
            'Download': 'Pakua',
            'Generating': 'Inatengeneza...',

            // Unit Page
            'Units': 'Unit',
            'Create Unit': 'Unda Unit',
            'Unit Number': 'Nambari ya Unit',
            'Unit Title': 'Jina la Unit',
            'Key Unit Competence': 'Umahiri Mkuu',
            'No units found': 'Hakuna unit zilizopatikana',

            // Lesson Page
            'Lessons': 'Masomo',
            'Create Lesson': 'Unda Somo',
            'Lesson Number': 'Nambari ya Somo',
            'Lesson Title': 'Jina la Somo',
            'Duration': 'Muda',
            'Topic Area': 'Eneo la Mada',
            'Sub-topic Area': 'Eneo la Mada Ndogo',
            'No lessons found': 'Hakuna masomo yaliyopatikana',

            // Lesson Plan Page
            'School Name': 'Jina la Shule',
            'Teacher\'s Name': 'Jina la Mwalimu',
            'Term': 'Muhula',
            'Date': 'Tarehe',
            'Subject': 'Somo',
            'Class': 'Darasa',
            'Unit Nº': 'Unit Nº',
            'Lesson Nº': 'Somo Nº',
            'Class Size': 'Ukubwa wa Darasa',
            'Special Needs': 'Mahitaji Maalum',
            'Unit Title Label': 'Jina la Unit',
            'Key Unit Competence Label': 'Umahiri Mkuu',
            'Title of the lesson': 'Jina la Somo',
            'Instructional Objective': 'Lengo la Mafunzo',
            'Plan for this Class': 'Mpango wa Darasa hili',
            'Learning Materials': 'Vifaa vya Kufundishia',
            'References': 'Marejeleo',
            'Timing for each step': 'Muda wa kila hatua',
            'Description of teaching and learning activity': 'Maelezo ya shughuli za ufundishaji',
            'Generic competences and Cross cutting issues': 'Umahiri wa jumla na masuala mtambuka',
            'Teacher activities': 'Shughuli za Mwalimu',
            'Learner activities': 'Shughuli za Mwanafunzi',
            'Teacher\'s self-evaluation': 'Tathmini binafsi ya Mwalimu',

            // Form Labels
            'Teaching Date': 'Tarehe ya Kufundisha',
            'Location': 'Mahali',
            'Reference Books': 'Vitabu vya Marejeleo (Chanzo cha Maarifa ya AI)',
            'Learners': 'Wanafunzi',

            // Empty States & Subtitles
            'Organize units subtitle': 'Panga maudhui ya somo lako katika unit ili kuanza kupanga masomo.',
            'Add lessons subtitle': 'Ongeza masomo kwenye unit hii ili kuanza kutumia AI kutengeneza mipango ya somo.',
            'No Lesson Plan Yet': 'Hakuna Mpango wa Somo bado',
            'AI Intro': 'AI yetu inaweza kutengeneza mpango kamili wa somo wa viwango vya REB (mfano wa 5Es) kwa sekunde.',
            'Generate Pro Lesson Plan': 'Tengeneza Mpango wa Somo wa Kitaalamu',

            // AI Status
            'AI Engine is Running': 'Mashine ya AI inafanya kazi',
            'Reading Reference Books': 'Inasoma Vitabu vya Marejeleo',
            'Extracting context': 'Inachambua muktadha...',
            'AI Curriculum Analysis': 'Uchambuzi wa Mtaala wa AI',
            'Structuring activities': 'Inapanga shughuli kwa kutumia mfano wa 5Es...',
            'Finalizing Table Layout': 'Inakamilisha Mpangilio wa Jedwali',
            'Polishing notations': 'inaboresha nukuu za ufundishaji...',
        }
    };

    useEffect(() => {
        if (!subjectName) return;

        const name = subjectName.toLowerCase();
        let lang = 'English';

        if (name.includes('kinyarwanda')) {
            lang = 'Kinyarwanda';
        } else if (name.includes('french') || name.includes('français') || name.includes('francais')) {
            lang = 'French';
        } else if (name.includes('kiswahili') || name.includes('swahili')) {
            lang = 'Kiswahili';
        }

        setLanguage(lang);
        setLabels(translations[lang]);
    }, [subjectName]);

    return { language, labels, t: (key) => labels[key] || translations['English'][key] || key };
};
