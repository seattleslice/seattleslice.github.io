// ===================== SCHEDULE SNAPSHOT =====================
// The day's sessions, pulled from the Sessions2026 sheet through the same
// parsing the live pages use, and frozen here so the TV board can run with
// no internet at all. live.html gives the sheet ten seconds to answer and
// then falls back to this; a live fetch that lands later still wins.
//
// Saved 2026-08-25. To refresh it before zipping the site: load live.html
// in a browser while online, run this in the console, and paste the result
// over the sessions array below:
//
//   JSON.stringify(sessions.map(function(s) { return { title: s.title,
//     format: s.format, time: s.time, room: s.room,
//     speakers: s.speakers.map(function(p) { return { name: p.name }; }) }; }))
window.SCHEDULE_SNAPSHOT = {
  savedAt: '2026-08-25',
  sessions: [
    {
      "title": "Fireside Chat with the Creators of Among Us",
      "format": "Panel",
      "time": "9:30:00 AM",
      "room": "A",
      "speakers": [
        {
          "name": "Ty Taylor"
        },
        {
          "name": "Forest Willard"
        },
        {
          "name": "Marcus Bromander"
        }
      ]
    },
    {
      "title": "Steam Q&A + Platform Update",
      "format": "Panel",
      "time": "11:30:00 AM",
      "room": "A",
      "speakers": [
        {
          "name": "Erik Peterson"
        },
        {
          "name": "Ria Hu"
        },
        {
          "name": "Tom Giardino"
        }
      ]
    },
    {
      "title": "Something Special, Nothing Stupid: What I Learned from 28 Years of Sucker Punch",
      "format": "Lecture",
      "time": "11:30:00 AM",
      "room": "AR",
      "speakers": [
        {
          "name": "Chris Zimmerman"
        }
      ]
    },
    {
      "title": "How Indie Teams Actually Get Built",
      "format": "Panel",
      "time": "10:30:00 AM",
      "room": "A",
      "speakers": [
        {
          "name": "Mitch Gitelman"
        },
        {
          "name": "Lou Fasulo"
        },
        {
          "name": "Zoë Curnoe"
        }
      ]
    },
    {
      "title": "You Got Laid Off, Now What?",
      "format": "Panel",
      "time": "4:45:00 PM",
      "room": "LH",
      "speakers": [
        {
          "name": "Lizzie Mintus"
        },
        {
          "name": "Zak Whaley"
        },
        {
          "name": "Alejandro Rodriguez"
        }
      ]
    },
    {
      "title": "From 120 People to One: What Ambition Actually Costs",
      "format": "Lecture",
      "time": "4:45:00 PM",
      "room": "AR",
      "speakers": [
        {
          "name": "Chris Taylor"
        }
      ]
    },
    {
      "title": "What I Wish New Founders Knew About Business",
      "format": "Panel",
      "time": "3:45:00 PM",
      "room": "A",
      "speakers": [
        {
          "name": "Rhys Dekle"
        },
        {
          "name": "Derek Reese"
        },
        {
          "name": "Brendan Wilson"
        },
        {
          "name": "David Edery"
        }
      ]
    },
    {
      "title": "Myths and Realities of Cannibalization - How to Suppress Your Steam Sales with Subscriptions and Overdiscounting?",
      "format": "Micro-talk",
      "time": "2:45:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Tom Kaczmarczyk"
        }
      ]
    },
    {
      "title": "Everything We Learned Shipping 14 UEFN Games in One Year",
      "format": "Lecture",
      "time": "11:30:00 AM",
      "room": "NR",
      "speakers": [
        {
          "name": "Jaden Holladay"
        }
      ]
    },
    {
      "title": "Standing Out in a Crowded Market: 5 Ways to Boost Discovery with XBOX",
      "format": "Lecture",
      "time": "10:30:00 AM",
      "room": "NR",
      "speakers": [
        {
          "name": "Chloé Giusti"
        }
      ]
    },
    {
      "title": "Hard Lessons from Indie Founders",
      "format": "Panel",
      "time": "1:45:00 PM",
      "room": "A",
      "speakers": [
        {
          "name": "Jen MacLean"
        },
        {
          "name": "Katie Golden"
        },
        {
          "name": "Bernie Yee"
        },
        {
          "name": "Veronica Peshterianu"
        }
      ]
    },
    {
      "title": "The Industry Is Better, Maybe: Tales from the Game Industry, 1990s & Early 2000s",
      "format": "Micro-talk",
      "time": "5:56:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Theresa Pudenz"
        }
      ]
    },
    {
      "title": "Follow the Money: Gaming Capital After the Reset",
      "format": "Panel",
      "time": "11:30:00 AM",
      "room": "LH",
      "speakers": [
        {
          "name": "Alina Soltys"
        },
        {
          "name": "Scott Hartsman"
        },
        {
          "name": "Arneh Khatchatourians"
        },
        {
          "name": "Michael Angst"
        }
      ]
    },
    {
      "title": "The Influencer Trap: Why Most Creator Campaigns Fail (And How to Fix Yours)",
      "format": "Panel",
      "time": "3:45:00 PM",
      "room": "LH",
      "speakers": [
        {
          "name": "Sandy Dávila"
        },
        {
          "name": "Zachary Rozga"
        },
        {
          "name": "Nathan Stewart"
        },
        {
          "name": "Christian Allen"
        }
      ]
    },
    {
      "title": "Acclimating to Dwarf Fortress's Codebase",
      "format": "Lecture",
      "time": "1:45:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Ana \"Putnam\""
        }
      ]
    },
    {
      "title": "Marketing Your Indie Game and Yourself",
      "format": "Lecture",
      "time": "9:30:00 AM",
      "room": "AR",
      "speakers": [
        {
          "name": "Angel Mero"
        }
      ]
    },
    {
      "title": "Self-Publishing on Your Own Terms",
      "format": "Panel",
      "time": "5:45:00 PM",
      "room": "A",
      "speakers": [
        {
          "name": "Rachel Heleva"
        },
        {
          "name": "Jakub Kasztalski"
        },
        {
          "name": "Dylan Gedig"
        },
        {
          "name": "Erika Mariko Olsen"
        }
      ]
    },
    {
      "title": "So, What Does a Publisher Actually Do in 2026?",
      "format": "Panel",
      "time": "2:45:00 PM",
      "room": "A",
      "speakers": [
        {
          "name": "Allie Paul"
        },
        {
          "name": "Brian Knox"
        },
        {
          "name": "Matt Nickerson"
        },
        {
          "name": "Amanda Kruse"
        }
      ]
    },
    {
      "title": "The Board Is Not the Game",
      "format": "Micro-talk",
      "time": "4:07:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Nate Chatellier"
        }
      ]
    },
    {
      "title": "Story: It Matters Even If It Doesn’t",
      "format": "Micro-talk",
      "time": "3:56:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Joe Morrissey"
        }
      ]
    },
    {
      "title": "Game Events: Two Businesses, One Budget",
      "format": "Panel",
      "time": "10:30:00 AM",
      "room": "LH",
      "speakers": [
        {
          "name": "Ihor Pospishnyi"
        },
        {
          "name": "Justin Woodward"
        },
        {
          "name": "Stephanie Barish"
        },
        {
          "name": "Paul Scherer"
        }
      ]
    },
    {
      "title": "Fractional by Design: Senior Expertise Without the Full-Time Hire",
      "format": "Panel",
      "time": "2:45:00 PM",
      "room": "LH",
      "speakers": [
        {
          "name": "Eugene Evans"
        },
        {
          "name": "Kim Swift"
        },
        {
          "name": "Aubrey Husted"
        },
        {
          "name": "Leah Hoyer"
        }
      ]
    },
    {
      "title": "Responsible Leadership: Lead Like a Tank",
      "format": "Lecture",
      "time": "3:45:00 PM",
      "room": "AR",
      "speakers": [
        {
          "name": "Renee Gittins"
        }
      ]
    },
    {
      "title": "Reinventing Yourself: Field Notes from 35 Years of Industry Change",
      "format": "Micro-talk",
      "time": "5:45:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Kurt Busch"
        }
      ]
    },
    {
      "title": "The Indie Launch Playbook: What Marketing Actually Works in 2026",
      "format": "Panel",
      "time": "4:45:00 PM",
      "room": "A",
      "speakers": [
        {
          "name": "Nathaniel Wattenmaker"
        },
        {
          "name": "Perrin Kaplan-Zenk"
        },
        {
          "name": "Gabriela Siemienkowicz"
        },
        {
          "name": "David Reid"
        }
      ]
    },
    {
      "title": "We Listen and We Don't Judge: Studio Legal Triage",
      "format": "Lecture",
      "time": "2:45:00 PM",
      "room": "AR",
      "speakers": [
        {
          "name": "James Barker"
        }
      ]
    },
    {
      "title": "SLICE Introduction",
      "format": "Lecture",
      "time": "9:00:00 AM",
      "room": "A",
      "speakers": [
        {
          "name": "Tim Cullings"
        },
        {
          "name": "Steve Hobbs"
        }
      ]
    },
    {
      "title": "Budgeting 101: Planning to Be Flexible",
      "format": "Lecture",
      "time": "9:30:00 AM",
      "room": "NR",
      "speakers": [
        {
          "name": "Brian Poel"
        }
      ]
    },
    {
      "title": "How to Craft an Effective Elevator Pitch",
      "format": "Micro-talk",
      "time": "4:45:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Ilja Rotelli"
        }
      ]
    },
    {
      "title": "Sustainable Design(ers): Managing Burnout for Game Devs",
      "format": "Micro-talk",
      "time": "2:56:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Dr. Elizabeth Kilmer"
        }
      ]
    },
    {
      "title": "Unlocking Growth: Strategic Opportunities of 3rd Party Platforms",
      "format": "Micro-talk",
      "time": "5:18:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Paul Scherer"
        }
      ]
    },
    {
      "title": "The One Indie Mistake That Quietly Kills Your Game",
      "format": "Micro-talk",
      "time": "4:18:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Toño Jimenez"
        }
      ]
    },
    {
      "title": "Graphical Optimizations in Unity 6",
      "format": "Lecture",
      "time": "10:30:00 AM",
      "room": "AR",
      "speakers": [
        {
          "name": "Esteban E. Maldonado Cabán"
        }
      ]
    },
    {
      "title": "Work For Hire / Services - Starting/Operating a WFH Studio",
      "format": "Panel",
      "time": "9:30:00 AM",
      "room": "LH",
      "speakers": [
        {
          "name": "Jason Schklar"
        },
        {
          "name": "Adam Creighton"
        },
        {
          "name": "Thomas O'Connor"
        },
        {
          "name": "Caroline Calaway"
        }
      ]
    },
    {
      "title": "“Just Make a Fun Game!” - But for Who?",
      "format": "Micro-talk",
      "time": "3:45:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Ahmet Uysal"
        }
      ]
    },
    {
      "title": "How to Build a Discord That Doesn't Suck",
      "format": "Lecture",
      "time": "9:52:00 AM",
      "room": "AR",
      "speakers": [
        {
          "name": "Mason Burnham"
        }
      ]
    },
    {
      "title": "Pitching in Asia Without Losing Face",
      "format": "Micro-talk",
      "time": "6:07:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "John Eternal"
        }
      ]
    },
    {
      "title": "Community by Design: Lessons from Guild Wars",
      "format": "Micro-talk",
      "time": "4:56:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "David Alexander"
        }
      ]
    },
    {
      "title": "Democratizing Unreal Environments with Gaussian Splatting",
      "format": "Micro-talk",
      "time": "5:07:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Gyanendra Vyas"
        }
      ]
    },
    {
      "title": "Plug and Play With the Epic Ecosystem - Tools for Indies Anywhere You Need Them",
      "format": "Lecture",
      "time": "5:45:00 PM",
      "room": "AR",
      "speakers": [
        {
          "name": "Matt Plut"
        }
      ]
    },
    {
      "title": "Social Impact as an Audience Growth Strategy",
      "format": "Panel",
      "time": "5:45:00 PM",
      "room": "LH",
      "speakers": [
        {
          "name": "Larry Hryb"
        },
        {
          "name": "Jenn Panattoni"
        },
        {
          "name": "Michael Angst"
        },
        {
          "name": "Gabriela Siemienkowicz"
        }
      ]
    },
    {
      "title": "Updating Player Experience with Haptics Design",
      "format": "Micro-talk",
      "time": "6:18:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Masatoshi Miyakawa"
        }
      ]
    },
    {
      "title": "Building Your Discord Server Through Every Stage of Game Development",
      "format": "Lecture",
      "time": "1:45:00 PM",
      "room": "AR",
      "speakers": [
        {
          "name": "Abe Haskins"
        }
      ]
    },
    {
      "title": "Accessibility First: How Inclusive Design Makes Better Games",
      "format": "Micro-talk",
      "time": "3:07:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Zach Clothier"
        }
      ]
    },
    {
      "title": "AI and Games in 2026 - Learnings and Predicting the Future",
      "format": "Panel",
      "time": "1:45:00 PM",
      "room": "LH",
      "speakers": [
        {
          "name": "Jon Kimmich"
        },
        {
          "name": "Alex Mandryka"
        },
        {
          "name": "Jason Schklar"
        },
        {
          "name": "Brian Tanner"
        }
      ]
    },
    {
      "title": "Small Steps, Safer Games: Tackling OCSEA",
      "format": "Micro-talk",
      "time": "3:18:00 PM",
      "room": "NR",
      "speakers": [
        {
          "name": "Kay Chau"
        }
      ]
    },
    {
      "title": "Ask Tencent Anything",
      "format": "Roundtable",
      "time": "9:30 AM, 10:30 AM",
      "room": "5B",
      "speakers": [
        {
          "name": "John Polson"
        }
      ]
    },
    {
      "title": "Before You Build: Early Decisions That Set Games Up for Success",
      "format": "Roundtable",
      "time": "1:45 PM, 2:45 PM",
      "room": "5B",
      "speakers": [
        {
          "name": "Geoffrey Zatkin"
        }
      ]
    },
    {
      "title": "Career Resilience in Games: What Developers Can Do When the Market Gets Hard",
      "format": "Roundtable",
      "time": "9:30 AM, 2:45 PM",
      "room": "5E",
      "speakers": [
        {
          "name": "Alejandro Rodriguez"
        }
      ]
    },
    {
      "title": "Connecting Design to Business Outcomes",
      "format": "Roundtable",
      "time": "1:45 PM, 2:45 PM",
      "room": "5F",
      "speakers": [
        {
          "name": "Leif Johansen"
        }
      ]
    },
    {
      "title": "Creating Better Pathways into Games & Creative Careers",
      "format": "Roundtable",
      "time": "10:30 AM, 11:30 AM",
      "room": "5E",
      "speakers": [
        {
          "name": "Darlene Mortel Edouard, PhD"
        },
        {
          "name": "Nicole Hendrix"
        }
      ]
    },
    {
      "title": "From Solo Dev to Studio: Surviving the Transition",
      "format": "Roundtable",
      "time": "3:45 PM, 4:45 PM",
      "room": "5E",
      "speakers": [
        {
          "name": "Sai Narayan Natarajan"
        }
      ]
    },
    {
      "title": "Funding Options for Indie Developers",
      "format": "Roundtable",
      "time": "9:30 AM, 10:30 AM",
      "room": "5A",
      "speakers": [
        {
          "name": "Ed Fries"
        }
      ]
    },
    {
      "title": "Hello Chat: Working with Content Creators",
      "format": "Roundtable",
      "time": "10:30 AM, 11:30 AM",
      "room": "5C",
      "speakers": [
        {
          "name": "Kevin M Williams"
        }
      ]
    },
    {
      "title": "How Can a Small Team Keep Supporting One Game While Building the Next?",
      "format": "Roundtable",
      "time": "4:45 PM, 5:45 PM",
      "room": "5C",
      "speakers": [
        {
          "name": "Michael Silverwood"
        }
      ]
    },
    {
      "title": "I Went Indie, Now What?",
      "format": "Roundtable",
      "time": "1:45 PM, 2:45 PM",
      "room": "5A",
      "speakers": [
        {
          "name": "Christian Allen"
        }
      ]
    },
    {
      "title": "It's Not About The Code - How I Learned To Stop Worrying And Love Open Source",
      "format": "Roundtable",
      "time": "3:45 PM, 4:45 PM",
      "room": "5B",
      "speakers": [
        {
          "name": "Mason Remaley"
        }
      ]
    },
    {
      "title": "Leading from Anywhere - Leadership Isn’t a Job Title",
      "format": "Roundtable",
      "time": "4:45 PM, 5:45 PM",
      "room": "5A",
      "speakers": [
        {
          "name": "Joshua Howard"
        }
      ]
    },
    {
      "title": "Lessons Learned from an Indie Studio",
      "format": "Roundtable",
      "time": "4:45 PM, 5:45 PM",
      "room": "5D",
      "speakers": [
        {
          "name": "Jen MacLean"
        }
      ]
    },
    {
      "title": "Lead with authenticity",
      "format": "Roundtable",
      "time": "8:00:00 AM",
      "room": "1A",
      "speakers": [
        {
          "name": "Carol Miu"
        }
      ]
    },
    {
      "title": "Power Without Permission: Leading, Creating, and Belonging as Women in Games",
      "format": "Roundtable",
      "time": "8:00:00 AM",
      "room": "1C",
      "speakers": [
        {
          "name": "Elaine Gómez"
        }
      ]
    },
    {
      "title": "Pragmatic Game Analytics for Indie Studios",
      "format": "Roundtable",
      "time": "10:30 AM, 11:30 AM",
      "room": "5D",
      "speakers": [
        {
          "name": "Shikha Tarware"
        }
      ]
    },
    {
      "title": "Reinventing Yourself While the Game Industry Gets Reinvented Around You",
      "format": "Roundtable",
      "time": "3:45 PM, 4:45 PM",
      "room": "5F",
      "speakers": [
        {
          "name": "Kurt Busch"
        }
      ]
    },
    {
      "title": "Ship Your Game! A Roundtable About Finishing and (Finally) Launching",
      "format": "Roundtable",
      "time": "11:30 AM, 5:45 PM",
      "room": "5B",
      "speakers": [
        {
          "name": "Richard Rouse III"
        }
      ]
    },
    {
      "title": "So, You Don’t Really Care About PR?",
      "format": "Roundtable",
      "time": "10:30 AM, 11:30 AM",
      "room": "5F",
      "speakers": [
        {
          "name": "Chris Brundage"
        },
        {
          "name": "Eden Au Nguyen"
        }
      ]
    },
    {
      "title": "The Minimum Viable GDD: Build One Together",
      "format": "Roundtable",
      "time": "2:45 PM, 3:45 PM",
      "room": "5D",
      "speakers": [
        {
          "name": "Joe Belousek"
        }
      ]
    },
    {
      "title": "The State of Co-Development",
      "format": "Roundtable",
      "time": "1:45 PM, 2:45 PM",
      "room": "5C",
      "speakers": [
        {
          "name": "Caroline Calaway"
        }
      ]
    },
    {
      "title": "Working with Publishers: Tales from the Front",
      "format": "Roundtable",
      "time": "1:45 PM, 5:45 PM",
      "room": "5E",
      "speakers": [
        {
          "name": "Jeff Pobst"
        }
      ]
    },
    {
      "title": "Your Voice, Your Value, Your Next Move",
      "format": "Roundtable",
      "time": "8:00:00 AM",
      "room": "1B",
      "speakers": [
        {
          "name": "Faith Price"
        }
      ]
    }
  ]
};
