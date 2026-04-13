/**
 * Database Seed Script
 * Creates sample data for development and testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
        },
    });
    console.log('✅ Created user:', user.username);

    // Create workout plans
    const plans = [
        {
            name: 'Peito + Bíceps',
            dayOfWeek: 'Segunda',
            description: 'Foco em peitoral e braço anterior',
            order: 1,
            exercises: [
                {
                    name: 'Supino Reto',
                    sets: 4,
                    reps: '8-10',
                    weight: '100kg',
                    restSeconds: 120,
                    notes: 'Descer até 90 graus',
                    order: 1,
                },
                {
                    name: 'Supino Inclinado',
                    sets: 3,
                    reps: '8-10',
                    weight: '80kg',
                    restSeconds: 90,
                    notes: 'Inclinação 45 graus',
                    order: 2,
                },
                {
                    name: 'Crucifixo',
                    sets: 3,
                    reps: '10-12',
                    weight: '25kg',
                    restSeconds: 60,
                    order: 3,
                },
                {
                    name: 'Rosca Direta',
                    sets: 4,
                    reps: '8-10',
                    weight: '30kg',
                    restSeconds: 90,
                    order: 4,
                },
                {
                    name: 'Rosca Martelo',
                    sets: 3,
                    reps: '10-12',
                    weight: '20kg',
                    restSeconds: 60,
                    order: 5,
                },
                {
                    name: 'Rosca Concentrada',
                    sets: 3,
                    reps: '12-15',
                    weight: '15kg',
                    restSeconds: 60,
                    order: 6,
                },
            ],
        },
        {
            name: 'Costas + Tríceps',
            dayOfWeek: 'Quarta',
            description: 'Foco em dorso e braço posterior',
            order: 2,
            exercises: [
                {
                    name: 'Puxada Frontal',
                    sets: 4,
                    reps: '8-10',
                    weight: '80kg',
                    restSeconds: 120,
                    order: 1,
                },
                {
                    name: 'Remada Curvada',
                    sets: 4,
                    reps: '8-10',
                    weight: '100kg',
                    restSeconds: 120,
                    order: 2,
                },
                {
                    name: 'Barra Fixa',
                    sets: 3,
                    reps: '8-12',
                    weight: 'Peso corporal',
                    restSeconds: 90,
                    order: 3,
                },
                {
                    name: 'Tríceps Pulley',
                    sets: 3,
                    reps: '10-12',
                    weight: '50kg',
                    restSeconds: 60,
                    order: 4,
                },
                {
                    name: 'Tríceps Francês',
                    sets: 3,
                    reps: '10-12',
                    weight: '20kg',
                    restSeconds: 60,
                    order: 5,
                },
                {
                    name: 'Mergulho',
                    sets: 3,
                    reps: '8-12',
                    weight: 'Peso corporal',
                    restSeconds: 90,
                    order: 6,
                },
            ],
        },
        {
            name: 'Pernas',
            dayOfWeek: 'Sexta',
            description: 'Day para membros inferiores completo',
            order: 3,
            exercises: [
                {
                    name: 'Agachamento',
                    sets: 4,
                    reps: '8-10',
                    weight: '140kg',
                    restSeconds: 120,
                    notes: 'Descer até 90 graus',
                    order: 1,
                },
                {
                    name: 'Leg Press',
                    sets: 3,
                    reps: '8-12',
                    weight: '300kg',
                    restSeconds: 90,
                    order: 2,
                },
                {
                    name: 'Extensora',
                    sets: 3,
                    reps: '10-12',
                    weight: '80kg',
                    restSeconds: 60,
                    order: 3,
                },
                {
                    name: 'Flexora',
                    sets: 3,
                    reps: '10-12',
                    weight: '60kg',
                    restSeconds: 60,
                    order: 4,
                },
                {
                    name: 'Panturrilha em Pé',
                    sets: 4,
                    reps: '15-20',
                    weight: '120kg',
                    restSeconds: 45,
                    order: 5,
                },
                {
                    name: 'Panturrilha Sentado',
                    sets: 3,
                    reps: '15-20',
                    weight: '60kg',
                    restSeconds: 45,
                    order: 6,
                },
            ],
        },
        {
            name: 'Ombros + Abdômen',
            dayOfWeek: 'Terça',
            description: 'Foco em ombros e core',
            order: 4,
            exercises: [
                {
                    name: 'Desenvolvimento Militar',
                    sets: 4,
                    reps: '8-10',
                    weight: '50kg',
                    restSeconds: 120,
                    order: 1,
                },
                {
                    name: 'Elevação Lateral',
                    sets: 3,
                    reps: '10-12',
                    weight: '15kg',
                    restSeconds: 60,
                    order: 2,
                },
                {
                    name: 'Elevação Frontal',
                    sets: 3,
                    reps: '10-12',
                    weight: '15kg',
                    restSeconds: 60,
                    order: 3,
                },
                {
                    name: 'Encolhimento',
                    sets: 3,
                    reps: '10-12',
                    weight: '60kg',
                    restSeconds: 60,
                    order: 4,
                },
                {
                    name: 'Abdominal Crunch',
                    sets: 3,
                    reps: '15-20',
                    weight: null,
                    restSeconds: 45,
                    order: 5,
                },
                {
                    name: 'Prancha',
                    sets: 3,
                    reps: '45-60s',
                    weight: null,
                    restSeconds: 60,
                    order: 6,
                },
            ],
        },
        {
            name: 'Cardio + Core',
            dayOfWeek: 'Sábado',
            description: 'Atividade aeróbica e fortalecimento central',
            order: 5,
            exercises: [
                {
                    name: 'Esteira',
                    sets: 1,
                    reps: '20 min',
                    weight: null,
                    restSeconds: 0,
                    notes: 'Intensidade moderar',
                    order: 1,
                },
                {
                    name: 'Bicicleta',
                    sets: 1,
                    reps: '15 min',
                    weight: null,
                    restSeconds: 0,
                    order: 2,
                },
                {
                    name: 'Abdominal Infra',
                    sets: 3,
                    reps: '15-20',
                    weight: null,
                    restSeconds: 45,
                    order: 3,
                },
                {
                    name: 'Oblíquo',
                    sets: 3,
                    reps: '15-20',
                    weight: null,
                    restSeconds: 45,
                    order: 4,
                },
            ],
        },
    ];

    for (const planData of plans) {
        const { exercises, ...planInput } = planData;
        const plan = await prisma.workoutPlan.upsert({
            where: { name: planInput.name },
            update: {},
            create: {
                ...planInput,
                exercises: {
                    create: exercises,
                },
            },
        });
        console.log(`✅ Created workout plan: ${plan.name}`);
    }

    // Create meal plan with meals and foods
    const meals = [
        {
            name: 'Café da Manhã',
            time: '07:00',
            order: 1,
            foods: [
                {
                    name: 'Ovos cozidos',
                    quantity: '3 unidades',
                    calories: 210,
                    protein: 18,
                    carbs: 1.1,
                    fat: 15.1,
                    order: 1,
                },
                {
                    name: 'Pão integral',
                    quantity: '2 fatias',
                    calories: 160,
                    protein: 6,
                    carbs: 28,
                    fat: 2,
                    order: 2,
                },
                {
                    name: 'Manteiga de amendoim',
                    quantity: '1 colher',
                    calories: 95,
                    protein: 4,
                    carbs: 3,
                    fat: 8,
                    order: 3,
                },
                {
                    name: 'Suco de laranja',
                    quantity: '200ml',
                    calories: 88,
                    protein: 1.7,
                    carbs: 20,
                    fat: 0.5,
                    order: 4,
                },
            ],
        },
        {
            name: 'Almoço',
            time: '12:00',
            order: 2,
            foods: [
                {
                    name: 'Frango grelhado',
                    quantity: '200g',
                    calories: 330,
                    protein: 52,
                    carbs: 0,
                    fat: 13,
                    order: 1,
                },
                {
                    name: 'Arroz integral',
                    quantity: '150g',
                    calories: 195,
                    protein: 4,
                    carbs: 43,
                    fat: 1.5,
                    order: 2,
                },
                {
                    name: 'Brócolis cozido',
                    quantity: '200g',
                    calories: 66,
                    protein: 7.2,
                    carbs: 11.2,
                    fat: 0.8,
                    order: 3,
                },
                {
                    name: 'Batata doce cozida',
                    quantity: '150g',
                    calories: 103,
                    protein: 1.6,
                    carbs: 24,
                    fat: 0.1,
                    order: 4,
                },
                {
                    name: 'Azeite',
                    quantity: '1 colher',
                    calories: 119,
                    protein: 0,
                    carbs: 0,
                    fat: 13.5,
                    order: 5,
                },
            ],
        },
        {
            name: 'Pré-Treino',
            time: '16:00',
            order: 3,
            foods: [
                {
                    name: 'Banana',
                    quantity: '1 média',
                    calories: 105,
                    protein: 1.3,
                    carbs: 27,
                    fat: 0.3,
                    order: 1,
                },
                {
                    name: 'Amendoim',
                    quantity: '1 porção 28g',
                    calories: 161,
                    protein: 7,
                    carbs: 5,
                    fat: 14,
                    order: 2,
                },
                {
                    name: 'Água',
                    quantity: '500ml',
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    order: 3,
                },
            ],
        },
        {
            name: 'Pós-Treino',
            time: '18:30',
            order: 4,
            foods: [
                {
                    name: 'Whey protein',
                    quantity: '1 scoop 30g',
                    calories: 120,
                    protein: 25,
                    carbs: 2,
                    fat: 1,
                    order: 1,
                },
                {
                    name: 'Mirtilo',
                    quantity: '100g',
                    calories: 57,
                    protein: 0.7,
                    carbs: 14.5,
                    fat: 0.3,
                    order: 2,
                },
                {
                    name: 'Dextrose',
                    quantity: '30g',
                    calories: 102,
                    protein: 0,
                    carbs: 25.5,
                    fat: 0,
                    order: 3,
                },
            ],
        },
        {
            name: 'Jantar',
            time: '20:00',
            order: 5,
            foods: [
                {
                    name: 'Salmon grelhado',
                    quantity: '180g',
                    calories: 322,
                    protein: 35,
                    carbs: 0,
                    fat: 19,
                    order: 1,
                },
                {
                    name: 'Batata borboleta',
                    quantity: '150g',
                    calories: 110,
                    protein: 2,
                    carbs: 24,
                    fat: 0.1,
                    order: 2,
                },
                {
                    name: 'Salada verde',
                    quantity: '200g',
                    calories: 32,
                    protein: 2.6,
                    carbs: 5.2,
                    fat: 0.4,
                    order: 3,
                },
                {
                    name: 'Limão',
                    quantity: '1/2 unidade',
                    calories: 9,
                    protein: 0.3,
                    carbs: 2.7,
                    fat: 0.2,
                    order: 4,
                },
            ],
        },
    ];

    const mealPlan = await prisma.mealPlan.upsert({
        where: { name: 'Plano Padrão' },
        update: {},
        create: {
            name: 'Plano Padrão',
            isActive: true,
            meals: {
                create: meals,
            },
        },
    });
    console.log(`✅ Created meal plan: ${mealPlan.name}`);

    // Create shopping list with items
    const shoppingList = await prisma.shoppingList.upsert({
        where: { name: 'Lista de Compras' },
        update: {},
        create: {
            name: 'Lista de Compras',
            items: {
                create: [
                    {
                        name: 'Frango peito',
                        quantity: '2kg',
                        category: 'Proteínas',
                        order: 1,
                    },
                    {
                        name: 'Ovos',
                        quantity: '2 dúzias',
                        category: 'Proteínas',
                        order: 2,
                    },
                    {
                        name: 'Salmão',
                        quantity: '1kg',
                        category: 'Proteínas',
                        order: 3,
                    },
                    {
                        name: 'Arroz integral',
                        quantity: '2kg',
                        category: 'Carboidratos',
                        order: 4,
                    },
                    {
                        name: 'Batata doce',
                        quantity: '3kg',
                        category: 'Carboidratos',
                        order: 5,
                    },
                    {
                        name: 'Brócolis',
                        quantity: '3 cabeças',
                        category: 'Vegetais',
                        order: 6,
                    },
                    {
                        name: 'Alface',
                        quantity: '2 unidades',
                        category: 'Vegetais',
                        order: 7,
                    },
                    {
                        name: 'Banana',
                        quantity: '1 cacho',
                        category: 'Frutas',
                        order: 8,
                    },
                    {
                        name: 'Mirtilo',
                        quantity: '500g',
                        category: 'Frutas',
                        order: 9,
                    },
                    {
                        name: 'Leite',
                        quantity: '2L',
                        category: 'Laticínios',
                        order: 10,
                    },
                ],
            },
        },
    });
    console.log(`✅ Created shopping list with ${shoppingList.items ? shoppingList.items.length : 10} items`);

    console.log('✨ Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
